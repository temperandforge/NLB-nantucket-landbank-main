/**
 * Seeds the Public Records page: the five record categories, and a DRAFT top-level page
 * "public-records" with a Hero - Tertiary and the Records Archive block.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedRecords.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedRecords.ts --with-user-token
 *   npx sanity exec scripts/seedRecords.ts --with-user-token -- --samples          (verification data)
 *   npx sanity exec scripts/seedRecords.ts --with-user-token -- --remove-samples
 *
 * What it writes: PUBLISHED `recordCategory` documents (matched on slug, any state; an existing
 * one is never edited, so Studio changes survive) and one draft `page` (matched on slug among
 * top-level pages; skipped if present). Sanity generates every id. The sort and filter settings
 * below are read from the Figma and need the client's confirmation; each is editable in Studio.
 * `--samples` also uploads one tiny PDF and creates published records whose title starts with
 * "[Sample]"; `--remove-samples` deletes exactly those and nothing else. Run `--samples` only
 * against a dataset where published sample records are acceptable.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const SAMPLES = process.argv.includes('--samples')
const REMOVE_SAMPLES = process.argv.includes('--remove-samples')
const SAMPLE_PREFIX = '[Sample] '
const key = () => randomUUID().slice(0, 8)

const INTRO =
  "In accordance with Massachusetts public law, all forms and records are available to download directly on this page. If you need something you don't see here or have questions about a specific record, please don't hesitate to contact our office — we're happy to help."

const CATEGORIES = [
  {slug: 'meeting-minutes', title: 'Meeting Minutes', order: 10, sortBy: 'dateDesc', filters: ['year']},
  {slug: 'meeting-agendas', title: 'Meeting Agendas', order: 20, sortBy: 'dateDesc', filters: ['year']},
  {slug: 'annual-reports', title: 'Annual Reports', order: 30, sortBy: 'dateDesc', filters: []},
  {slug: 'policies', title: 'Policies', order: 40, sortBy: 'titleAsc', filters: []},
  {slug: 'establishment-documents', title: 'Establishment Documents', order: 50, sortBy: 'titleAsc', filters: []},
]

const SAMPLE_RECORDS = [
  {category: 'meeting-minutes', date: '2025-03-12'},
  {category: 'meeting-minutes', date: '2025-07-09'},
  {category: 'meeting-minutes', date: '2024-11-05'},
  {category: 'meeting-minutes', title: 'Special meeting'},
  {category: 'meeting-agendas', date: '2025-03-12'},
  {category: 'annual-reports', date: '2023-12-31'},
  {category: 'policies', title: 'Zoning policy'},
  {category: 'policies', title: 'Access policy'},
]

const TINY_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)

async function removeSamples() {
  const all = await client.fetch<{_id: string; title?: string}[]>(`*[_type == "record"]{_id, title}`)
  // Filtered in JS: a GROQ `match` is word-tokenized, not a literal prefix test.
  const samples = all.filter((record) => record.title?.startsWith(SAMPLE_PREFIX))
  for (const sample of samples) {
    if (DRY_RUN) console.log(`[dry run] would delete ${sample._id}`)
    else await client.delete(sample._id)
  }
  console.log(`${DRY_RUN ? '[dry run] would delete' : 'deleted'} ${samples.length} sample record(s).`)
}

async function seedCategories() {
  const ids = new Map<string, string>()
  for (const category of CATEGORIES) {
    const existing = await client.fetch<string | null>(
      `*[_type == "recordCategory" && slug.current == $slug][0]._id`,
      {slug: category.slug},
    )
    if (existing) {
      ids.set(category.slug, existing.replace(/^drafts\./, ''))
      console.log(`  = exists: category ${category.slug} (${existing})`)
      continue
    }
    if (DRY_RUN) {
      console.log(`[dry run] would create category ${category.slug}`)
      continue
    }
    const created = await client.create({
      _type: 'recordCategory',
      title: category.title,
      slug: {_type: 'slug', current: category.slug},
      order: category.order,
      sortBy: category.sortBy,
      filters: category.filters,
    })
    ids.set(category.slug, created._id)
    console.log(`  + created category ${category.slug} (${created._id})`)
  }
  return ids
}

async function seedPage() {
  const existing = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "public-records" && !defined(parent)][0]._id`,
  )
  if (existing) {
    console.log(`  = exists: page public-records (${existing})`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry run] would create draft page public-records')
    return
  }
  const page = await client.create({
    _id: 'drafts.',
    _type: 'page',
    name: 'Public Records',
    slug: {_type: 'slug', current: 'public-records'},
    pathOnly: false,
    pageBuilder: [
      {_type: 'heroTertiary', _key: key(), eyebrow: 'Public Records', heading: 'Public Records', headingLevel: 'h1', body: INTRO},
      {_type: 'recordsArchive', _key: key()},
    ],
  } as never)
  console.log(`  + created draft page public-records (${page._id})`)
}

async function seedSamples(categoryIds: Map<string, string>) {
  if (DRY_RUN) {
    console.log(`[dry run] would upload a sample PDF and create ${SAMPLE_RECORDS.length} sample records`)
    return
  }
  const asset = await client.assets.upload('file', TINY_PDF, {filename: 'sample-record.pdf', contentType: 'application/pdf'})
  for (const sample of SAMPLE_RECORDS) {
    const category = categoryIds.get(sample.category)
    if (!category) {
      console.log(`  ! no category ${sample.category}, skipped a sample`)
      continue
    }
    // The prefix is what --remove-samples finds them by, so every sample keeps it in its title.
    const title = `${SAMPLE_PREFIX}${sample.title ?? sample.date}`
    const exists = await client.fetch<string | null>(
      `*[_type == "record" && title == $title && category._ref == $category][0]._id`,
      {title, category},
    )
    if (exists) continue
    await client.create({
      _type: 'record',
      title,
      ...(sample.date ? {date: sample.date} : {}),
      file: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}},
      category: {_type: 'reference', _ref: category},
    })
    console.log(`  + created sample ${title}`)
  }
}

async function main() {
  if (REMOVE_SAMPLES) return removeSamples()
  const ids = await seedCategories()
  await seedPage()
  if (SAMPLES) await seedSamples(ids)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
