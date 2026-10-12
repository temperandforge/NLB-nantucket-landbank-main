/**
 * Adds a Map Explorer block to the end of the Interactive Map page (explore/interactive-map).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/addMapExplorerToMapPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/addMapExplorerToMapPage.ts --with-user-token
 *
 * What it writes: one appended `mapExplorer` item on that page's pageBuilder, to the draft if the
 * page has one, otherwise to the published document. It never removes, reorders or edits existing
 * blocks. Idempotent: does nothing if either version already has a Map Explorer. It does not add a
 * heading: if the page has no Hero Tertiary it says so, because that copy is the client's.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)

type PageRow = {_id: string; types: string[] | null}

async function main() {
  const rows = await client.fetch<PageRow[]>(
    `*[_type == "page" && slug.current == "interactive-map" && parent->slug.current == "explore"]{
       _id,
       "types": pageBuilder[]._type
     }`,
  )
  if (rows.length === 0) {
    console.error('There is no explore/interactive-map page. Nothing was written.')
    process.exit(1)
  }

  if (rows.some((row) => row.types?.includes('mapExplorer'))) {
    console.log('  = explore/interactive-map already has a Map Explorer block')
    return
  }

  const target = rows.find((row) => row._id.startsWith('drafts.')) ?? rows[0]
  if (!rows.some((row) => row.types?.includes('heroTertiary'))) {
    console.warn('  ! the page has no Hero Tertiary: add one in the Studio for the heading and intro')
  }

  if (DRY_RUN) {
    console.log(`[dry run] would append a mapExplorer block to ${target._id}`)
    return
  }
  await client
    .patch(target._id)
    .setIfMissing({pageBuilder: []})
    .append('pageBuilder', [{_type: 'mapExplorer', _key: key()}])
    .commit()
  console.log(`  + appended a Map Explorer block to ${target._id}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
