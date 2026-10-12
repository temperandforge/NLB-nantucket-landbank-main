/**
 * Fills the News page's page builder (the page with slug "news", under Our Work): a Hero -
 * Tertiary header (the Figma copy) and the News Archive block.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedNewsPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedNewsPage.ts --with-user-token
 *
 * What it writes: `pageBuilder` on the existing News page, only when that field is empty, on the
 * published document and on its draft if one exists. It never replaces blocks someone has added,
 * and creates no page: it stops if the News page is missing.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)

const INTRO =
  "Stay connected to the Land Bank through Nantucket News, our regular update on conservation milestones, property news, upcoming events, and stories from across our protected lands. Whether we're announcing a new acquisition, sharing a dispatch from the field, or highlighting the wildlife and wildflowers of the season, Nantucket News is where you'll find it."

async function main() {
  const pages = await client.fetch<{_id: string; pageBuilder?: unknown[] | null}[]>(
    `*[_type == "page" && slug.current == "news"]{_id, pageBuilder}`,
  )
  if (pages.length === 0) {
    console.error('There is no "news" page. Nothing was written.')
    process.exit(1)
  }
  for (const page of pages) {
    if ((page.pageBuilder ?? []).length > 0) {
      console.log(`  = has blocks, left alone: ${page._id}`)
      continue
    }
    const blocks = [
      {_type: 'heroTertiary', _key: key(), eyebrow: 'News', heading: 'Nantucket News', headingLevel: 'h1', body: INTRO},
      {_type: 'newsArchive', _key: key(), showFilters: true},
    ]
    if (DRY_RUN) {
      console.log(`[dry run] would add ${blocks.length} blocks to ${page._id}`)
      continue
    }
    await client.patch(page._id).set({pageBuilder: blocks}).commit()
    console.log(`  + added ${blocks.length} blocks to ${page._id}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
