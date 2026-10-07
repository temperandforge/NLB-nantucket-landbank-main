/**
 * Imports the FAQs extracted from the WordPress site (extractFaqs.sh) as DRAFTS: the FAQ
 * categories and the FAQs, each answer converted from HTML to Portable Text (faqs.ts).
 *
 * Run from the studio directory:
 *   scripts/wordpress/extractFaqs.sh                    (once, read-only; writes faqs.json)
 *   npx sanity exec scripts/wordpress/importWordpressFaqs.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importWordpressFaqs.ts --with-user-token
 *   npx sanity exec scripts/wordpress/importWordpressFaqs.ts --with-user-token -- --remove-samples
 *   npx sanity exec scripts/wordpress/verifyWordpressFaqs.ts --with-user-token
 *
 * What it writes: draft `faq` and `faqCategory` documents (Sanity generates every id, per the
 * project rule). A FAQ references its category with a weak reference that strengthens on publish,
 * as Studio does for a draft-only target.
 *
 * Idempotent and non-destructive: a category is matched on its slug and a FAQ on its question
 * (case, spacing and entities ignored), among published documents and drafts. Anything found is
 * skipped and NEVER edited, so a re-run cannot overwrite an editor's changes.
 *
 * --dry prints the plan and writes nothing (except faqs-import-plan.json). --remove-samples ALSO
 * deletes the sample FAQs and categories seeded earlier (seedPhaseBContent.ts), matched by their
 * exact questions and slugs, printing each first. It runs BEFORE matching, so a sample that
 * shares a question with a real FAQ is replaced by the real one rather than mistaken for it; a
 * sample category still used by another FAQ is kept. A report of every WordPress id and its
 * Sanity id is written to scripts/data/wordpress/ (git-ignored).
 */

import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {planFaqCategories, planFaqs, type FaqSnapshot} from './faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const REMOVE_SAMPLES = process.argv.includes('--remove-samples')
const DATA_DIR = resolve(__dirname, '../data/wordpress')

const SAMPLE_QUESTIONS = [
  'Where can I get paper maps?',
  'Does the Land Bank have a lost and found?',
  'Can I process my forms by mail?',
  'A question with no category',
]
const SAMPLE_CATEGORY_SLUGS = ['general', 'empty-category']

const published = (id: string) => id.replace(/^drafts\./, '')
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()

async function main() {
  const snapshotPath = resolve(DATA_DIR, 'faqs.json')
  if (!existsSync(snapshotPath)) {
    console.error('No faqs.json: run scripts/wordpress/extractFaqs.sh first. Nothing was written.')
    process.exit(1)
  }
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as FaqSnapshot
  const categories = planFaqCategories(snapshot.categories)
  const {faqs, issues} = planFaqs(snapshot)

  console.log(`Plan: ${faqs.length} FAQs, ${categories.length} categories.`)
  issues.forEach((issue) => console.log(`  ! ${issue}`))

  const sampleIds = REMOVE_SAMPLES ? await findSamples() : {faqs: [], categories: []}

  // Categories first: FAQs reference them.
  const categoryIds = new Map<string, string>()
  const existingCategories = await client.fetch<Array<{_id: string; slug?: string}>>(
    `*[_type == "faqCategory"]{_id, "slug": slug.current}`,
  )
  for (const row of existingCategories) {
    if (row.slug && !sampleIds.categories.includes(row._id)) categoryIds.set(row.slug, published(row._id))
  }
  const createdCategories: Array<{slug: string; sanityId: string}> = []
  for (const category of categories) {
    if (categoryIds.has(category.slug)) {
      console.log(`  = category exists: ${category.slug}`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  [dry run] would create category: ${category.title}`)
      categoryIds.set(category.slug, `dry-${category.slug}`)
      continue
    }
    const created = await client.create({
      _id: 'drafts.',
      _type: 'faqCategory',
      title: category.title,
      slug: {_type: 'slug', current: category.slug},
      order: category.order,
    } as never)
    console.log(`  + category created: ${category.title} (${created._id})`)
    categoryIds.set(category.slug, published(created._id))
    createdCategories.push({slug: category.slug, sanityId: created._id})
  }

  const existingFaqs = await client.fetch<Array<{_id: string; question?: string}>>(
    `*[_type == "faq"]{_id, question}`,
  )
  const existing = new Map<string, string>()
  for (const row of existingFaqs) {
    if (row.question && !sampleIds.faqs.includes(row._id)) existing.set(normalize(row.question), published(row._id))
  }

  const created: Array<{wpId: number; question: string; sanityId: string; hasAnswer: boolean}> = []
  const skipped: Array<{wpId: number; question: string; sanityId: string}> = []

  for (const faq of faqs) {
    const found = existing.get(normalize(faq.question))
    if (found) {
      console.log(`  = exists: ${faq.question}`)
      skipped.push({wpId: faq.wpId, question: faq.question, sanityId: found})
      continue
    }
    if (DRY_RUN) {
      console.log(
        `  [dry run] would create FAQ: ${faq.question} (${faq.categorySlug ?? 'no category'}, ${faq.answer.length ? `${faq.answer.length} answer block(s)` : 'NO ANSWER'})`,
      )
      continue
    }
    const categoryRef = faq.categorySlug ? categoryIds.get(faq.categorySlug) : undefined
    const result = await client.create({
      _id: 'drafts.',
      _type: 'faq',
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      ...(categoryRef
        ? {
            category: {
              _type: 'reference',
              _ref: categoryRef,
              _weak: true,
              _strengthenOnPublish: {type: 'faqCategory'},
            },
          }
        : {}),
    } as never)
    console.log(`  + FAQ created: ${faq.question} (${result._id})`)
    created.push({wpId: faq.wpId, question: faq.question, sanityId: result._id, hasAnswer: faq.answer.length > 0})
  }

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created.length} created, ${skipped.length} already existed.`)

  writeFileSync(
    resolve(DATA_DIR, DRY_RUN ? 'faqs-import-plan.json' : 'faqs-import-report.json'),
    JSON.stringify({at: new Date().toISOString(), issues, createdCategories, created, skipped}, null, 2),
  )

  if (REMOVE_SAMPLES) await removeSamples(sampleIds)
}

type Samples = {faqs: string[]; categories: string[]}

/** The sample documents seeded earlier, matched by exact question and slug. Read-only. */
async function findSamples(): Promise<Samples> {
  const faqRows = await client.fetch<Array<{_id: string; question: string}>>(
    `*[_type == "faq" && question in $questions]{_id, question}`,
    {questions: SAMPLE_QUESTIONS},
  )
  const categoryRows = await client.fetch<Array<{_id: string; slug: string}>>(
    `*[_type == "faqCategory" && slug.current in $slugs]{_id, "slug": slug.current}`,
    {slugs: SAMPLE_CATEGORY_SLUGS},
  )
  return {faqs: faqRows.map((r) => r._id), categories: categoryRows.map((r) => r._id)}
}

async function removeSamples(samples: Samples) {
  const ids: string[] = []
  const faqRows = await client.fetch<Array<{_id: string; question: string}>>(
    `*[_id in $ids]{_id, question}`,
    {ids: samples.faqs},
  )
  for (const row of faqRows) {
    console.log(`  - sample FAQ: ${row.question} (${row._id})`)
    ids.push(row._id)
  }
  // A sample category is kept while any FAQ that is not itself being deleted still uses it.
  const categoryRows = await client.fetch<Array<{_id: string; title: string}>>(
    `*[_id in $ids]{_id, title}`,
    {ids: samples.categories},
  )
  const remaining = await client.fetch<Array<{_id: string; category?: string}>>(
    `*[_type == "faq" && !(_id in $faqIds)]{_id, "category": category._ref}`,
    {faqIds: samples.faqs},
  )
  for (const row of categoryRows) {
    const users = remaining.filter((faq) => faq.category === published(row._id)).length
    if (users > 0) {
      console.log(`  ~ sample category kept, still used by ${users} FAQ(s): ${row.title}`)
      continue
    }
    console.log(`  - sample category: ${row.title} (${row._id})`)
    ids.push(row._id)
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${ids.length} sample document(s) ${DRY_RUN ? 'would be ' : ''}deleted.`)
  if (DRY_RUN || ids.length === 0) return
  const transaction = client.transaction()
  ids.forEach((id) => transaction.delete(id))
  await transaction.commit()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
