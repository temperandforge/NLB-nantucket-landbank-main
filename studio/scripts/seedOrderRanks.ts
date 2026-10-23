/**
 * Gives every draggable document its first drag-and-drop rank (`orderRank`, from the Orderable
 * Document List plugin), in the order it appears today: the old `order` number, then a tiebreak (the
 * name or title for people and categories, which is how they were sorted; oldest first for FAQs).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedOrderRanks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedOrderRanks.ts --with-user-token
 *
 * What it writes: `orderRank` on `faq`, `faqCategory`, `staffMember`, `commissioner`, `department`,
 * `newsCategory`, `projectType` and `recordCategory` documents (published and draft; a draft shares
 * its published document's rank). Nothing else, and any old `order` field is left in place.
 *
 * Idempotent: a type where any document already has a rank is skipped entirely, so it never
 * overwrites an order set by hand. Use "Reset Order" in the Studio list to re-rank from scratch.
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
// How ties on the old `order` were broken, so the first ranks match what visitors see today.
const TIEBREAK = {
  faq: 'created',
  faqCategory: 'created',
  staffMember: 'label',
  commissioner: 'label',
  department: 'label',
  newsCategory: 'label',
  projectType: 'label',
  recordCategory: 'label',
} as const
const TYPES = Object.keys(TIEBREAK) as Array<keyof typeof TIEBREAK>

type Doc = {_id: string; _createdAt: string; order?: number | null; orderRank?: string | null; label?: string}

const baseId = (id: string) => id.replace(/^drafts\./, '')

async function seed(type: (typeof TYPES)[number]) {
  const docs = await client.fetch<Doc[]>(
    `*[_type == $type]{_id, _createdAt, order, orderRank, "label": coalesce(question, title, name)}`,
    {type},
  )
  if (docs.some((doc) => doc.orderRank)) {
    console.log(`${type}: already has ranks, skipped.`)
    return
  }
  // One entry per document, whichever of published or draft exists first by creation date.
  const byBase = new Map<string, Doc>()
  for (const doc of docs) {
    const base = baseId(doc._id)
    const known = byBase.get(base)
    if (!known || doc._id === base) byBase.set(base, doc)
  }
  const ordered = [...byBase.values()].sort(
    (a, b) =>
      (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
      (TIEBREAK[type] === 'label'
        ? (a.label ?? '').localeCompare(b.label ?? '')
        : a._createdAt.localeCompare(b._createdAt)) ||
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
  ordered.forEach((doc, i) => console.log(`  ${i + 1}. ${doc.label ?? doc._id}`))
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
