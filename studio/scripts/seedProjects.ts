/**
 * Seeds the Projects section from the data that used to be hardcoded in
 * frontend/app/map/properties.ts, so moving the map onto Sanity does not change what it shows.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedProjects.ts --with-user-token
 *
 * Creates, if missing:
 *   - 5 propertyType and 6 resource documents (matched on slug)
 *   - 8 project documents (matched on slug), referencing those and carrying their marker
 *     coordinates and boundary id
 *   - the Project Settings singleton, with scripts/data/boundaries.geojson uploaded as the
 *     boundary data file
 *
 * Idempotent. Existing documents are matched on their natural key and reused, never overwritten -
 * including Project Settings, whose fields are only filled in where they are still empty, so a
 * re-run cannot discard a boundary file the client has since uploaded.
 *
 * Pass --dry to print the plan without writing.
 */

import {readFileSync} from 'node:fs'
import {join} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const BOUNDARY_FILE = join(__dirname, 'data', 'boundaries.geojson')

/** Matches the "id" property on each feature in boundaries.geojson. */
const BOUNDARY_ID_PROPERTY = 'id'

const NANTUCKET_CENTER = {lat: 41.2835, lng: -70.0995}
const DEFAULT_ZOOM = 11

const PROPERTY_TYPES: {slug: string; title: string}[] = [
  {slug: 'beach', title: 'Beach'},
  {slug: 'trail', title: 'Trail'},
  {slug: 'conservation', title: 'Conservation Land'},
  {slug: 'harbor', title: 'Harbor'},
  {slug: 'pond', title: 'Pond'},
]

const RESOURCES: {slug: string; title: string}[] = [
  {slug: 'parking', title: 'Parking'},
  {slug: 'handicap-accessible', title: 'Handicap Accessible'},
  {slug: 'restrooms', title: 'Restrooms'},
  {slug: 'lifeguard', title: 'Lifeguard'},
  {slug: 'picnic-area', title: 'Picnic Area'},
  {slug: 'dog-friendly', title: 'Dog Friendly'},
]

type ProjectSpec = {
  slug: string
  name: string
  propertyTypes: string[]
  resources: string[]
  /** [lng, lat], as the old data stored it. */
  coordinates: [number, number]
}

const PROJECTS: ProjectSpec[] = [
  {
    slug: 'surfside-beach',
    name: 'Surfside Beach',
    propertyTypes: ['beach'],
    resources: ['parking', 'handicap-accessible', 'restrooms', 'lifeguard', 'dog-friendly'],
    coordinates: [-70.0942, 41.246],
  },
  {
    slug: 'jetties-beach',
    name: 'Jetties Beach',
    propertyTypes: ['beach'],
    resources: ['parking', 'handicap-accessible', 'restrooms', 'lifeguard', 'picnic-area'],
    coordinates: [-70.1073, 41.2989],
  },
  {
    slug: 'madaket-beach',
    name: 'Madaket Beach',
    propertyTypes: ['beach'],
    resources: ['parking', 'restrooms', 'lifeguard'],
    coordinates: [-70.2153, 41.2637],
  },
  {
    slug: 'sanford-farm-trail',
    name: 'Sanford Farm, Ram Pasture & The Woods',
    propertyTypes: ['trail', 'conservation'],
    resources: ['parking', 'dog-friendly'],
    coordinates: [-70.1633, 41.2743],
  },
  {
    slug: 'middle-moors-trail',
    name: 'Middle Moors',
    propertyTypes: ['trail', 'conservation'],
    resources: ['dog-friendly'],
    coordinates: [-70.0453, 41.2718],
  },
  {
    slug: 'nantucket-harbor',
    name: 'Nantucket Harbor',
    propertyTypes: ['harbor'],
    resources: ['parking', 'handicap-accessible', 'restrooms'],
    coordinates: [-70.0968, 41.2865],
  },
  {
    slug: 'long-pond',
    name: 'Long Pond',
    propertyTypes: ['pond', 'conservation'],
    resources: ['parking', 'dog-friendly', 'picnic-area'],
    coordinates: [-70.1911, 41.2764],
  },
  {
    slug: 'dionis-beach',
    name: 'Dionis Beach',
    propertyTypes: ['beach'],
    resources: ['parking', 'handicap-accessible', 'restrooms', 'picnic-area'],
    coordinates: [-70.1367, 41.3105],
  },
]

async function ensureTaxonomy(
  type: 'propertyType' | 'resource',
  spec: {slug: string; title: string},
): Promise<string> {
  const existing = await client.fetch<string | null>(
    `*[_type == $type && slug.current == $slug][0]._id`,
    {type, slug: spec.slug},
  )
  if (existing) {
    console.log(`  = ${type} exists: ${spec.slug}`)
    return existing
  }
  if (DRY_RUN) {
    console.log(`  + would create ${type}: ${spec.slug} ("${spec.title}")`)
    return `dry-${type}-${spec.slug}`
  }
  const created = await client.create({
    _type: type,
    title: spec.title,
    slug: {_type: 'slug', current: spec.slug},
  })
  console.log(`  + ${type} created: ${spec.slug} (${created._id})`)
  return created._id
}

function reference(id: string, key: string) {
  return {_type: 'reference' as const, _ref: id, _key: key}
}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  console.log('Property types:')
  const propertyTypeIds = new Map<string, string>()
  for (const spec of PROPERTY_TYPES) {
    propertyTypeIds.set(spec.slug, await ensureTaxonomy('propertyType', spec))
  }

  console.log('\nResources:')
  const resourceIds = new Map<string, string>()
  for (const spec of RESOURCES) {
    resourceIds.set(spec.slug, await ensureTaxonomy('resource', spec))
  }

  console.log('\nProjects:')
  for (const spec of PROJECTS) {
    const existing = await client.fetch<string | null>(
      `*[_type == "project" && slug.current == $slug][0]._id`,
      {slug: spec.slug},
    )
    if (existing) {
      console.log(`  = project exists, left untouched: ${spec.slug}`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  + would create project: ${spec.slug} (boundary "${spec.slug}")`)
      continue
    }
    const created = await client.create({
      _type: 'project',
      name: spec.name,
      slug: {_type: 'slug', current: spec.slug},
      propertyTypes: spec.propertyTypes.map((s) => reference(propertyTypeIds.get(s)!, `pt-${s}`)),
      resources: spec.resources.map((s) => reference(resourceIds.get(s)!, `r-${s}`)),
      // The generated boundary file uses the project slug as each feature's id, so the two line
      // up without a mapping table. The client's real file will use its own identifiers.
      boundaryId: spec.slug,
      location: {_type: 'geopoint', lng: spec.coordinates[0], lat: spec.coordinates[1]},
    })
    console.log(`  + project created: ${spec.slug} (${created._id})`)
  }

  console.log('\nProject Settings:')
  const settings = await client.fetch<{
    _id: string
    hasBoundaryData: boolean
  } | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{
       _id,
       "hasBoundaryData": defined(boundaryData.asset)
     }`,
  )

  if (settings?.hasBoundaryData) {
    console.log('  = boundary data already uploaded, left untouched')
  } else if (DRY_RUN) {
    console.log(`  + would upload ${BOUNDARY_FILE} and set boundaryIdProperty="${BOUNDARY_ID_PROPERTY}"`)
  } else {
    const buffer = readFileSync(BOUNDARY_FILE)
    const asset = await client.assets.upload('file', buffer, {
      filename: 'nantucket-boundaries.geojson',
      contentType: 'application/geo+json',
    })
    console.log(`  + uploaded boundary file (${asset._id})`)

    // createIfNotExists then patch, rather than createOrReplace: the page-content fields may
    // already have been filled in through the Studio and must survive a re-run.
    await client.createIfNotExists({_id: 'projectSettings', _type: 'projectSettings'})
    await client
      .patch('projectSettings')
      .set({
        boundaryData: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}},
      })
      .setIfMissing({
        boundaryIdProperty: BOUNDARY_ID_PROPERTY,
        defaultCenter: {_type: 'geopoint', ...NANTUCKET_CENTER},
        defaultZoom: DEFAULT_ZOOM,
      })
      .commit()
    console.log('  + settings written')
  }

  console.log(`\n${DRY_RUN ? 'Dry run complete.' : 'Done.'}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
