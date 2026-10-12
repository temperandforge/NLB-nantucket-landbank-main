/**
 * Fills the Events page's page builder (the page with slug "events", under Our Work): a Hero -
 * Tertiary header (the Figma copy) and the Events Grid block.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedEventsPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedEventsPage.ts --with-user-token
 *
 * What it writes: `pageBuilder` on the existing Events page, only when that field is empty, on the
 * published document and on its draft if one exists. It never replaces blocks someone has added,
 * and creates no page: it stops if the Events page is missing.
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
  'Don’t miss what’s happening on the land. From guided nature walks and volunteer stewardship days to community workdays and seasonal programming, the Land Bank hosts events throughout the year for all ages and interests. Check back often — new events are added regularly, and they fill up fast.'

async function main() {
  const pages = await client.fetch<{_id: string; pageBuilder?: unknown[] | null}[]>(
    `*[_type == "page" && slug.current == "events"]{_id, pageBuilder}`,
  )
  if (pages.length === 0) {
    console.error('There is no "events" page. Nothing was written.')
    process.exit(1)
  }
  for (const page of pages) {
    if ((page.pageBuilder ?? []).length > 0) {
      console.log(`  = has blocks, left alone: ${page._id}`)
      continue
    }
    const blocks = [
      {
        _type: 'heroTertiary',
        _key: key(),
        eyebrow: 'Events',
        heading: 'Our upcoming events',
        headingLevel: 'h1',
        body: INTRO,
      },
      {_type: 'eventsGrid', _key: key(), emptyText: 'No upcoming events right now. Check back soon.'},
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
