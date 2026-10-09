/**
 * Seeds the 23 properties listed on nantucketlandbank.org/properties/featured-properties-and-trails/
 * as DRAFT `property` documents (nothing is published).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedFeaturedProperties.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedFeaturedProperties.ts --with-user-token
 *
 * What it writes: a draft for every featured property. A featured property that matches an
 * existing property (by slug, or by the `existing` slug where the migrated name differs) is NOT
 * duplicated - its draft is created from the published copy if it has none, and only its EMPTY
 * fields (description, image, link, propertyTypes, resources) are filled. Name, slug, boundaryIds
 * and location are never touched, and no existing value is overwritten. Properties with no match
 * are new drafts with no boundary, so they list on the Properties archive but do not draw on the
 * map until a boundary is assigned in Studio. Idempotent: a second run finds every field filled.
 *
 * Images: every property without one gets the placeholder asset PLACEHOLDER_IMAGE (already in the
 * media library), because the originals were deliberately not downloaded. Replace them in Studio.
 * `link` is the `#` placeholder until property detail pages exist (issue #23).
 * Amenities are limited to the icons the listing shows (Handicap Accessible) - the listing's "Trail
 * Map Available" has no matching resource document, so it is not invented.
 *
 * Not matched to an existing property on purpose (ambiguous in the migrated data, so new drafts
 * are created and the duplicates, if any, are for the client to merge): Gardner Farm (existing
 * "Powers - Gardner Farm"), Burchell Farm ("Mizzenmast/Burchell"), Hinsdale Park ("Hinsdale",
 * "Hinsdale Rd").
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const PLACEHOLDER_IMAGE = 'image-6aae98100fd7c0f40a96f751eb02bb2c562a3067-4000x3000-jpg'

const TRAILS = 'trails'
const CONSERVATION = 'conservation'
const PARKS = 'parks'
const PONDS = 'ponds'
const WATER = 'water-access'
const RECREATION = 'recreational-properties'
const ACCESSIBLE = 'handicap-accessible'

interface Featured {
  name: string
  slug: string
  /** Slug of the existing migrated property this is, when it differs from `slug`. */
  existing?: string
  description: string
  types: string[]
  resources?: string[]
}

const FEATURED: Featured[] = [
  {
    name: 'Easton St Rain Garden',
    slug: 'easton-st-rain-garden',
    description:
      'A rain garden is a shallow depression that is intentionally designed and landscaped to direct, absorb, and filter stormwater runoff.',
    types: [PARKS],
    resources: [ACCESSIBLE],
  },
  {
    name: 'The Coast to Coast Trail',
    slug: 'the-coast-to-coast-trail',
    description:
      'The Coast to Coast Trail is just over 24 miles long and takes hikers across the island through a diverse array of habitats as they follow the sun, from east to west.',
    types: [TRAILS],
  },
  {
    name: 'The Creeks Preserve',
    slug: 'the-creeks-preserve',
    description:
      'The Creeks Preserve overlooks the Creeks salt marsh, Nantucket Harbor, and on a clear day, Brant Point Lighthouse.',
    types: [PARKS, CONSERVATION],
    resources: [ACCESSIBLE],
  },
  {
    name: 'Gardner Farm',
    slug: 'gardner-farm',
    description:
      'Purchased from the Gardner Family in 1995, this 112 acre parcel was actively farmed for much of the eighteen and nineteen hundreds before being allowed to naturally reseed.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Hinsdale Park & Discovery Playground',
    slug: 'hinsdale-park',
    description:
      'Hinsdale Park is a multi-use area dedicated to outdoor play, fitness and community gathering, with a playground, mowed athletic fields, a labyrinth, and a trail system.',
    types: [PARKS, RECREATION],
    resources: [ACCESSIBLE],
  },
  {
    name: 'Beechwood Farm',
    slug: 'beechwood-farm',
    existing: 'norwood',
    description:
      "Beechwood Farm is located in Polpis, which was originally the agricultural center of Nantucket.",
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Smooth Hummocks Coastal Preserve',
    slug: 'smooth-hummocks-coastal-preserve',
    description:
      "The Smooth Hummocks Coastal Preserve provides a beautiful location to walk along the south shore of the island and serves as a gateway to some of Nantucket's most popular beaches.",
    types: [CONSERVATION, TRAILS],
  },
  {
    name: 'Lily Pond Park',
    slug: 'lily-pond-park',
    existing: 'lily-pond',
    description:
      'Located just a short walk from downtown, this park offers a welcome respite from the hustle and bustle of Main Street, with boardwalks through wetland habitat.',
    types: [PARKS, PONDS],
  },
  {
    name: 'Maxcy Pond',
    slug: 'maxcy-pond',
    description:
      "A picture-perfect freshwater pond in northwest Nantucket with several access points to the water, ideal for kayaking, fishing and picnicking.",
    types: [PONDS, WATER],
  },
  {
    name: 'Head of the Plains',
    slug: 'sanford-farm-west-head-of-the-plains',
    existing: 'head-of-plains',
    description:
      'A vast corridor of conservation land, with more than 1,000 acres jointly owned by the Nantucket Land Bank and the Nantucket Conservation Foundation.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Millbrook Woods & Heritage Orchard',
    slug: 'millbrook-woods-heritage-orchard',
    existing: 'millbrook-orchard',
    description:
      "Millbrook Woods bookends Massachusetts Audubon's Lost Farm property, which abuts the Land Bank's Gardner Farm on its other side.",
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Stump Pond',
    slug: 'stump-pond',
    description:
      'Jointly owned by the Land Bank and the Nantucket Conservation Foundation, single-track trails lead through densely forested wetland pockets.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Sheep Commons',
    slug: 'sheep-commons',
    description:
      "Historically used as pastures for sheep grazing, the property's trails wind through pitch pine forests, scrub oak shrublands, and open grasslands.",
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Sanford Meadows',
    slug: 'sanford-meadows',
    description:
      'A 165-acre property on the western end of Nantucket off Madaket Road, rolling sandplain grassland full of sedges, grasses and wildflowers.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Burchell Farm',
    slug: 'burchell-farm',
    description:
      'A 70-acre property running along the northern half of Miacomet Pond, with 2.3 miles of single-track trail through pitch pine woodland.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: "Trott's Hills",
    slug: 'trotts-hills',
    existing: 'trott-s-hills',
    description:
      "Bisected by Madaket Road, the Trott's Hills property is jointly owned with the Town of Nantucket and the Nantucket Conservation Foundation.",
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Reyes Pond',
    slug: 'reyes-pond',
    existing: 'reyes',
    description:
      'Acquired in 2017 from the Reyes family, a nearly 16-acre parcel of diverse wetlands and a man-made pond, with labeled specimen trees from around the world.',
    types: [PONDS, CONSERVATION],
  },
  {
    name: 'Holly Farm',
    slug: 'holly-farm',
    description:
      'Originally owned by Donald and Marie Craig, who grew and harvested holly for local sales and export during the early 1900s, with views of Polpis Harbor.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Shawkemo Highlands',
    slug: 'shawkemo-hills',
    description:
      'Several trails that can be walked as loops or used to connect to the Middle Moors, with views of the Middle Moors and Nantucket Harbor.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'West End Overlook',
    slug: 'west-end-overlook',
    description:
      'A 17-acre property in Madaket that provides easy public access to Madaket Harbor for kayaking and other water-related activities.',
    types: [TRAILS, WATER],
  },
  {
    name: 'South Shore Loop',
    slug: 'south-shore-loop',
    description:
      'An 81-acre property of dunes, sandplain grasslands, coastal heathlands and shrublands with areas of pitch pine canopy.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Peter Folger Homestead',
    slug: 'peter-folger-homestead',
    description:
      'Connects Wannacomet Road and Crooked Lane through winding trails that cross over wetlands via an extensive boardwalk system.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Cato Commons',
    slug: 'cato-commons',
    description:
      'A 17-acre natural refuge in the heart of a mid-island neighborhood, less than a mile from the High School.',
    types: [TRAILS, CONSERVATION],
  },
  {
    name: 'Miacomet Woods',
    slug: 'miacomet-woods',
    description:
      'A 32-acre forest dominated by pitch pines, with a 0.8-mile trail and habitat for the northern long-eared bat.',
    types: [TRAILS, CONSERVATION],
  },
]

const published = (id: string) => id.replace(/^drafts\./, '')
const weakRef = (id: string, type: string) => ({
  _type: 'reference' as const,
  _weak: true,
  _ref: id,
  _strengthenOnPublish: {type},
})
const refs = (ids: string[], type: string) =>
  ids.map((id) => ({...weakRef(id, type), _key: id.slice(0, 8)}))

type Doc = Record<string, unknown> & {_id: string; slug?: {current?: string}}

async function main() {
  const [types, resources, properties, asset] = await Promise.all([
    client.fetch<{_id: string; slug: string}[]>(`*[_type == "propertyType"]{_id, "slug": slug.current}`),
    client.fetch<{_id: string; slug: string}[]>(`*[_type == "resource"]{_id, "slug": slug.current}`),
    client.fetch<Doc[]>(`*[_type == "property"]`),
    client.fetch<string | null>(`*[_id == $id][0]._id`, {id: PLACEHOLDER_IMAGE}),
  ])
  if (!asset) throw new Error(`Placeholder image ${PLACEHOLDER_IMAGE} not found in the dataset`)

  const typeId = new Map(types.map((t) => [t.slug, t._id]))
  const resourceId = new Map(resources.map((r) => [r.slug, r._id]))
  const lookup = (m: Map<string, string>, slug: string) => {
    const id = m.get(slug)
    if (!id) throw new Error(`No document with slug "${slug}"`)
    return id
  }

  // A document id may exist as published, draft, or both; prefer the draft as the one to edit.
  const bySlug = new Map<string, {draft?: Doc; live?: Doc}>()
  for (const doc of properties) {
    const s = doc.slug?.current
    if (!s) continue
    const entry = bySlug.get(s) ?? {}
    if (doc._id.startsWith('drafts.')) entry.draft = doc
    else entry.live = doc
    bySlug.set(s, entry)
  }

  const image = (name: string) => ({
    _type: 'image',
    asset: {_type: 'reference', _ref: PLACEHOLDER_IMAGE},
    alt: name,
  })
  const empty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

  let created = 0
  let enriched = 0
  for (const f of FEATURED) {
    const fill = {
      description: f.description,
      image: image(f.name),
      link: '#',
      propertyTypes: refs(f.types.map((t) => lookup(typeId, t)), 'propertyType'),
      ...(f.resources
        ? {resources: refs(f.resources.map((r) => lookup(resourceId, r)), 'resource')}
        : {}),
    }

    const match = bySlug.get(f.existing ?? f.slug) ?? bySlug.get(f.slug)
    if (!match) {
      created += 1
      console.log(`  + new draft: ${f.name}`)
      if (!DRY_RUN) {
        await client.create({
          _id: 'drafts.',
          _type: 'property',
          name: f.name,
          slug: {_type: 'slug', current: f.slug},
          ...fill,
        } as never)
      }
      continue
    }

    const base = match.draft ?? match.live!
    const patch = Object.fromEntries(Object.entries(fill).filter(([k]) => empty(base[k])))
    if (Object.keys(patch).length === 0) {
      console.log(`  = complete: ${f.name}`)
      continue
    }
    enriched += 1
    console.log(`  ~ ${f.name} (${base.name}): fills ${Object.keys(patch).join(', ')}`)
    if (DRY_RUN) continue
    if (match.draft) {
      await client.patch(match.draft._id).set(patch).commit()
    } else {
      const {_rev, _createdAt, _updatedAt, ...copy} = match.live!
      void _rev
      void _createdAt
      void _updatedAt
      await client.create({...copy, ...patch, _id: `drafts.${published(match.live!._id)}`} as never)
    }
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} new, ${enriched} enriched`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
