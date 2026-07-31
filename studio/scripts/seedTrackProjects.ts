/**
 * Creates one `project` document per feature in the uploaded boundary file (currently 517
 * `track_N` parcels converted from the client's real LandBankProperties.gpx), so each one exists
 * as a project the manual matching work can rename/re-tag once the real property it corresponds
 * to is identified.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedTrackProjects.ts --with-user-token
 *
 * Creates, for every boundary feature not already a project (matched on slug):
 *   - name: the feature's identifier (e.g. "track_42")
 *   - slug: the same, slugified
 *   - boundaryId: the same, so it draws on /map immediately
 *   - propertyTypes: exactly one, chosen at random from the existing propertyType documents
 *   - resources: 0-2, chosen at random (no duplicates) from the existing resource documents
 *
 * Never creates or modifies propertyType/resource documents - it only reads the ones that
 * already exist and references them. If none exist yet, run seedProjects.ts first.
 *
 * Idempotent. Existing projects are matched on slug and left completely untouched - re-running
 * only creates whatever's still missing.
 *
 * Pass --dry to print the plan (counts and a few samples) without writing anything.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

/** Documents per transaction. Keeps each commit small rather than one 517-document transaction. */
const BATCH_SIZE = 50

function reference(id: string, key: string) {
  return {_type: 'reference' as const, _ref: id, _key: key}
}

/** Fisher-Yates-ish: picks `count` distinct random elements from `items`, order not preserved. */
function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const settings = await client.fetch<{url?: string} | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{"url": boundaryData.asset->url}`,
  )
  if (!settings?.url) {
    console.error('No boundary data file uploaded on Project Settings. Nothing to do.')
    process.exit(1)
  }

  const response = await fetch(settings.url)
  if (!response.ok) {
    console.error(`Could not download the boundary file (${response.status}).`)
    process.exit(1)
  }
  const geojson = await response.json()
  const features: unknown[] = Array.isArray(geojson?.features) ? geojson.features : []

  const featureIds: string[] = []
  const seen = new Set<string>()
  for (const feature of features) {
    const name = (feature as {properties?: Record<string, unknown>})?.properties?.name
    if (typeof name !== 'string' || !name || seen.has(name)) continue
    seen.add(name)
    featureIds.push(name)
  }
  console.log(`Boundary file has ${features.length} feature(s), ${featureIds.length} with a usable, unique name.`)

  const propertyTypeIds: string[] = await client.fetch(`*[_type == "propertyType"]._id`)
  const resourceIds: string[] = await client.fetch(`*[_type == "resource"]._id`)
  if (propertyTypeIds.length === 0) {
    console.error('No propertyType documents exist. Run seedProjects.ts first.')
    process.exit(1)
  }
  console.log(`Found ${propertyTypeIds.length} propertyType(s) and ${resourceIds.length} resource(s) to choose from.\n`)

  const existingSlugs = new Set<string>(
    await client.fetch(`*[_type == "project" && defined(slug.current)].slug.current`),
  )

  const toCreate = featureIds.filter((id) => !existingSlugs.has(id))
  console.log(
    `${featureIds.length - toCreate.length} project(s) already exist for a boundary feature, left untouched.`,
  )
  console.log(`${toCreate.length} project(s) to create.`)

  if (DRY_RUN) {
    console.log('\nSample of what would be created:')
    for (const id of toCreate.slice(0, 5)) {
      const propertyTypeCount = 1
      const resourceCount = Math.floor(Math.random() * 3) // 0, 1, or 2
      console.log(`  + ${id} (1 propertyType, ${resourceCount} resource(s))`)
    }
    if (toCreate.length > 5) console.log(`  ...and ${toCreate.length - 5} more.`)
    console.log('\nDry run complete.')
    return
  }

  let created = 0
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()

    for (const id of batch) {
      const propertyType = pickRandom(propertyTypeIds, 1)[0]
      const resources = pickRandom(resourceIds, Math.floor(Math.random() * 3)) // 0-2

      tx.create({
        _type: 'project',
        name: id,
        slug: {_type: 'slug', current: id},
        boundaryId: id,
        propertyTypes: [reference(propertyType, 'pt-0')],
        resources: resources.map((resourceId, index) => reference(resourceId, `r-${index}`)),
      })
    }

    await tx.commit()
    created += batch.length
    console.log(`  + created ${created}/${toCreate.length}`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
