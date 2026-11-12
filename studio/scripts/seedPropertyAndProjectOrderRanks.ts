/**
 * Gives every property and project its first drag-and-drop rank (`orderRank`, from the Orderable Document List
 * plugin), in the order visitors see today: alphabetical by name. Without it, documents with no
 * rank fall to the end of the list, oldest first, so the archives and map would reshuffle.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedPropertyAndProjectOrderRanks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPropertyAndProjectOrderRanks.ts --with-user-token
 *
 * What it writes: `orderRank` on `property` and `project` documents (published and draft; a draft shares its
 * published document's rank). Nothing else.
 *
 * Idempotent: for a type where any document already has a rank the script does nothing, so it never overwrites an
 * order set by hand. --force re-ranks alphabetically regardless, discarding any order set by hand.
 *
 * --dry prints the plan and writes nothing.
 */

import {LexoRank} from 'lexorank'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')
const TYPES = ['property', 'project'] as const

type Doc = {_id: string; _createdAt: string; orderRank?: string | null; name?: string}

const baseId = (id: string) => id.replace(/^drafts\./, '')

async function seed(type: (typeof TYPES)[number]) {
  const docs = await client.fetch<Doc[]>(`*[_type == $type]{_id, _createdAt, orderRank, name}`, {type})
  if (!FORCE && docs.some((doc) => doc.orderRank)) {
    console.log(`${type}: already has ranks, skipped (--force re-ranks alphabetically).`)
    return
  }
  // One entry per property; the published document wins over its draft.
  const byBase = new Map<string, Doc>()
  for (const doc of docs) {
    const base = baseId(doc._id)
    const known = byBase.get(base)
    if (!known || doc._id === base) byBase.set(base, doc)
  }
  const ordered = [...byBase.values()].sort(
    (a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '') ||
      a._createdAt.localeCompare(b._createdAt) ||
      a._id.localeCompare(b._id),
  )
  let rank = LexoRank.middle()
  const ranks = new Map<string, string>()
  for (const doc of ordered) {
    ranks.set(baseId(doc._id), rank.toString())
    rank = rank.genNext()
  }
  console.log(`${type}: ${docs.length} document(s), in this order:`)
  ordered.forEach((doc, i) => console.log(`  ${i + 1}. ${doc.name ?? doc._id}`))
  if (DRY_RUN) return
  const tx = client.transaction()
  for (const doc of docs) tx.patch(doc._id, {set: {orderRank: ranks.get(baseId(doc._id))}})
  await tx.commit()
  console.log(`${type}: ranked.`)
}

async function main() {
  for (const type of TYPES) await seed(type)
  if (DRY_RUN) console.log('Dry run: nothing written.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
