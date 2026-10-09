/**
 * Validates the imported FAQs against the WordPress extraction. Read-only.
 *
 *   npx sanity exec scripts/wordpress/verifyWordpressFaqs.ts --with-user-token
 *
 * For every planned FAQ: exactly one document with the same question, order, category and the
 * converted answer, byte for byte. For every planned category: exactly one document with its slug.
 * Also checks that each category's FAQ count matches the source, that no answer still holds raw
 * HTML, and reports (without failing) any other FAQ documents, such as samples. Exits non-zero
 * when anything does not match.
 */

import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {planFaqCategories, planFaqs, type FaqSnapshot} from './faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const published = (id: string) => id.replace(/^drafts\./, '')
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()

type FaqDoc = {_id: string; question?: string; order?: number; category?: string; answer?: unknown[]}
type CategoryDoc = {_id: string; slug?: string; title?: string}

/** JSON with object keys sorted: the API returns keys in its own order, which is not a difference. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )

let failures = 0
function check(ok: boolean, message: string): boolean {
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}`)
    failures += 1
  }
  return ok
}

async function main() {
  const snapshotPath = resolve(__dirname, '../data/wordpress/faqs.json')
  if (!existsSync(snapshotPath)) {
    console.error('No faqs.json: run scripts/wordpress/extractFaqs.sh first.')
    process.exit(1)
  }
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as FaqSnapshot
  const categories = planFaqCategories(snapshot.categories)
  const {faqs} = planFaqs(snapshot)

  const faqDocs = await client.fetch<FaqDoc[]>(
    `*[_type == "faq"]{_id, question, order, "category": category._ref, answer}`,
  )
  const categoryDocs = await client.fetch<CategoryDoc[]>(
    `*[_type == "faqCategory"]{_id, "slug": slug.current, title}`,
  )

  console.log('Categories')
  const categoryIdBySlug = new Map<string, string>()
  for (const category of categories) {
    const matches = categoryDocs.filter((doc) => doc.slug === category.slug)
    // A published document and its draft are one document to an editor.
    const ids = new Set(matches.map((doc) => published(doc._id)))
    if (check(ids.size === 1, `category "${category.slug}" exists exactly once`)) {
      categoryIdBySlug.set(category.slug, [...ids][0])
    }
  }

  console.log('FAQs')
  for (const faq of faqs) {
    const matches = faqDocs.filter((doc) => doc.question && normalize(doc.question) === normalize(faq.question))
    const ids = new Set(matches.map((doc) => published(doc._id)))
    if (!check(ids.size === 1, `"${faq.question}" exists exactly once`)) continue
    const doc = matches.find((d) => d._id.startsWith('drafts.')) ?? matches[0]
    check(doc.order === faq.order, `  order is ${faq.order}`)
    const expectedCategory = faq.categorySlug ? categoryIdBySlug.get(faq.categorySlug) : undefined
    check(doc.category === expectedCategory, `  category is ${faq.categorySlug ?? 'none'}`)
    check(
      canonical(doc.answer ?? []) === canonical(faq.answer),
      `  answer matches the conversion (${faq.answer.length} block(s))`,
    )
    check(
      !JSON.stringify(doc.answer ?? []).match(/<\/?[a-z][a-z0-9]*[\s>]|<!--/i),
      `  answer holds no raw HTML`,
    )
  }

  console.log('Totals')
  for (const category of categories) {
    const expected = faqs.filter((f) => f.categorySlug === category.slug).length
    const id = categoryIdBySlug.get(category.slug)
    const actual = new Set(
      faqDocs.filter((doc) => id && doc.category === id).map((doc) => published(doc._id)),
    ).size
    check(actual >= expected, `category "${category.slug}" has ${actual} FAQ(s), source has ${expected}`)
  }

  const planned = new Set(faqs.map((f) => normalize(f.question)))
  const others = new Set(
    faqDocs
      .filter((doc) => !doc.question || !planned.has(normalize(doc.question)))
      .map((doc) => doc.question ?? doc._id),
  )
  if (others.size) {
    console.log(`  note ${others.size} other FAQ document(s) not from WordPress: ${[...others].join('; ')}`)
  }

  console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
