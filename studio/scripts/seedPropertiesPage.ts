/**
 * Creates the Properties archive page as a DRAFT under the existing Explore page: a header (the
 * Figma copy) and the Property Archive block.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedPropertiesPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPropertiesPage.ts --with-user-token
 *
 * What it writes: one draft `page` (Sanity generates the id). Idempotent: matched on its slug under
 * the Explore page, in any state, and skipped if it exists; it never edits an existing page and
 * creates no parent: it stops if Explore is missing. The parent reference is weak, so it holds
 * whether or not Explore is published.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const published = (id: string) => id.replace(/^drafts\./, '')

const INTRO =
  "The Land Bank's more than 3,500 protected acres span the full breadth of Nantucket — from open heathland and sandplain grassland to freshwater ponds, coastal wetlands, working farms, and quiet forest trails. Each property has its own character, its own ecology, and its own role in the larger mosaic of protected land that defines the island. Browse our properties below to find your next walk, fishing spot, or simply a place to go and be outside."

async function main() {
  const parent = await client.fetch<string | null>(`*[_type == "page" && slug.current == "explore"][0]._id`)
  if (!parent) {
    console.error('There is no "explore" page to put Properties under. Nothing was written.')
    process.exit(1)
  }
  const parentId = published(parent)

  const exists = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "properties" && parent._ref == $parent][0]._id`,
    {parent: parentId},
  )
  if (exists) {
    console.log(`  = exists: explore/properties (${exists})`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry run] would create draft page explore/properties')
    return
  }
  const result = await client.create({
    _id: 'drafts.',
    _type: 'page',
    name: 'Properties',
    slug: {_type: 'slug', current: 'properties'},
    parent: {_type: 'reference', _ref: parentId, _weak: true, _strengthenOnPublish: {type: 'page'}},
    pathOnly: false,
    pageBuilder: [
      {_type: 'heroTertiary', _key: key(), eyebrow: 'Properties', heading: 'Our Properties', headingLevel: 'h1', body: INTRO},
      {_type: 'propertyArchive', _key: key()},
    ],
  } as never)
  console.log(`  + created draft: explore/properties (${result._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
