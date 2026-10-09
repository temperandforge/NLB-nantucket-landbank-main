/**
 * Publishes every draft staff member and commissioner (the WordPress people import creates drafts).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/publishPeople.ts --with-user-token -- --dry
 *   npx sanity exec scripts/publishPeople.ts --with-user-token
 *
 * What it writes: for each `drafts.<id>` of type staffMember or commissioner, createOrReplace the
 * published `<id>` with the draft's content and delete the draft (what Studio's Publish does).
 * Sample documents named "Test - ..." are skipped. Documents with no draft are left alone, so re-running is safe.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

async function main() {
  const drafts = await client.fetch<Record<string, unknown>[]>(
    `*[_type in ["staffMember","commissioner"] && _id in path("drafts.**")]`,
  )
  if (drafts.length === 0) return console.log('No draft people. Nothing to publish.')
  for (const draft of drafts) {
    if (String(draft.name).startsWith('Test -')) {
      console.log(`  - skipped sample: ${draft.name}`)
      continue
    }
    const id = String(draft._id).replace(/^drafts\./, '')
    console.log(`${DRY_RUN ? '[dry run] would publish' : '  + published'} ${draft._type}: ${draft.name} (${id})`)
    if (DRY_RUN) continue
    await client
      .transaction()
      .createOrReplace({...draft, _id: id} as never)
      .delete(String(draft._id))
      .commit()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
