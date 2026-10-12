/**
 * Unsets `link` on every `project` document, published and draft: projects have a page of their
 * own now, so the field was removed from the schema. A removed field is not deleted from existing
 * documents, so this does it.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/unsetProjectLinks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/unsetProjectLinks.ts --with-user-token
 *
 * What it discards: the `link` value of each project that has one. Values that are empty or the
 * `#` placeholder are listed as "placeholder"; any other value is a real address someone typed, and
 * is printed so you can read it before the real run. Idempotent: documents without `link` are
 * skipped. It touches no other field.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

async function main() {
  const docs = await client.fetch<{_id: string; name?: string; link: string}[]>(
    `*[_type == "project" && defined(link)]{_id, name, link}`,
  )
  console.log(`${docs.length} project document(s) have a link${DRY_RUN ? ' (dry run)' : ''}.`)
  for (const doc of docs) {
    const real = doc.link.trim() !== '' && doc.link.trim() !== '#'
    console.log(`  ${doc._id}  ${doc.name ?? '(no name)'}  ${real ? `REAL: ${doc.link}` : 'placeholder'}`)
  }
  if (DRY_RUN || docs.length === 0) return

  const tx = client.transaction()
  for (const doc of docs) tx.patch(doc._id, (patch) => patch.unset(['link']))
  await tx.commit()
  console.log(`Unset link on ${docs.length} document(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
