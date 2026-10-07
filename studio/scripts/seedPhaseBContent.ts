/**
 * Seeds sample content for the Phase B blocks, as DRAFTS only (nothing is published):
 * taxonomies, news articles, events, FAQs, staff and commissioners.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedPhaseBContent.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPhaseBContent.ts --with-user-token
 *
 * What it writes: draft documents (Sanity generates every id) plus the sample images it
 * references. Idempotent: each document is matched on a natural key (slug, name, question or
 * title) among published documents and drafts, and skipped if it exists. It never edits an
 * existing document (so an article seeded before it had a body keeps none: add text in Studio, or
 * remove the draft and run this again). Events are dated relative to the day it runs, so there are always upcoming
 * ones. References to the draft taxonomies are weak (they strengthen on publish). Staff and commissioners have no headshots: the cards must show their neutral fallback.
 */

import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const ref = (id: string) => ({_type: 'reference' as const, _ref: id})
/**
 * A reference to a document that exists only as a draft. A normal reference is rejected ("references
 * non-existent document"), so this is weak and becomes strong when the referencing document is
 * published, which is what Studio itself writes.
 */
const weakRef = (id: string, type: string) => ({
  _type: 'reference' as const,
  _ref: id,
  _weak: true,
  _strengthenOnPublish: {type},
})

/** Published id of a document, or of a draft of it. */
const published = (id: string) => id.replace(/^drafts\./, '')

async function find(type: string, field: string, value: string) {
  const ids = await client.fetch<string[]>(`*[_type == $type && ${field} == $value]._id`, {type, value})
  return ids.length > 0 ? published(ids[0]) : null
}

let created = 0
async function ensure(type: string, field: string, value: string, doc: Record<string, unknown>) {
  const existing = await find(type, field, value)
  if (existing) return existing
  created += 1
  if (DRY_RUN) {
    console.log(`[dry run] would create ${type}: ${value}`)
    return `dry-${type}-${value}`
  }
  const result = await client.create({_id: 'drafts.', _type: type, ...doc} as never)
  return published(result._id)
}

async function uploadImage(file: string) {
  if (DRY_RUN) return `dry-image-${file}`
  const path = resolve(__dirname, '../../frontend/public/images/properties', file)
  return (await client.assets.upload('image', createReadStream(path), {filename: file}))._id
}

const slug = (current: string) => ({_type: 'slug', current})
const daysFromNow = (days: number, hourUtc: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(hourUtc, 30, 0, 0)
  return d.toISOString()
}
const text = (value: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key(), text: value, marks: []}],
})

async function main() {
  // Taxonomies
  const conservation = await ensure('newsCategory', 'slug.current', 'conservation', {
    title: 'Conservation',
    slug: slug('conservation'),
    order: 10,
  })
  const admin = await ensure('department', 'slug.current', 'administration', {
    title: 'Administration',
    slug: slug('administration'),
    order: 10,
  })
  const property = await ensure('department', 'slug.current', 'property-management', {
    title: 'Property Management',
    slug: slug('property-management'),
    order: 20,
  })
  const general = await ensure('faqCategory', 'slug.current', 'general', {
    title: 'General FAQ',
    slug: slug('general'),
    order: 10,
  })
  const filing = await ensure('faqCategory', 'slug.current', 'form-filing', {
    title: 'Form Filing',
    slug: slug('form-filing'),
    order: 20,
  })
  await ensure('faqCategory', 'slug.current', 'empty-category', {
    title: 'A category with no FAQs (must not appear)',
    slug: slug('empty-category'),
    order: 30,
  })

  // Articles (images are the repo's sample property photos)
  const [beach, jetties, pond] = await Promise.all([
    uploadImage('dionis-beach.jpg'),
    uploadImage('jetties-beach.jpg'),
    uploadImage('long-pond.jpg'),
  ])
  const image = (id: string, alt: string) => ({_type: 'image', asset: ref(id), alt})
  // An article's text: a paragraph, its image, then two more paragraphs.
  const body = (id: string, alt: string) => [
    text('It turns out the best thing you can do for yourself might also be the most obvious.'),
    {...image(id, alt), _key: key()},
    text('Walking in natural settings amplifies those benefits further, and the trails are open every day.'),
    text('The land is here, and so are all the reasons to get out onto it.'),
  ]

  await ensure('article', 'slug.current', 'moorland-carbon-study', {
    title: 'New Study Highlights Carbon Storage Value of Nantucket’s Moorland Ecosystems',
    slug: slug('moorland-carbon-study'),
    date: '2026-08-02',
    image: image(pond, 'A moorland pond'),
    categories: [{...weakRef(conservation, 'newsCategory'), _key: key()}],
    body: body(pond, 'A moorland pond'),
    // An override: this tile goes to /map, though the article's own page is still reachable.
    link: {_type: 'link', linkType: 'href', href: '/map'},
  })
  await ensure('article', 'slug.current', 'polpis-road-farm', {
    title: 'Polpis Road Farm Acquisition Preserves Working Agricultural Land',
    slug: slug('polpis-road-farm'),
    date: '2026-07-12',
    image: image(beach, 'A sandy path through moorland'),
    categories: [{...weakRef(conservation, 'newsCategory'), _key: key()}],
    body: body(beach, 'A sandy path through moorland'),
    // No link: this tile goes to the article's own page.
  })
  await ensure('article', 'slug.current', 'no-category-article', {
    title: 'An article with no category and no link',
    slug: slug('no-category-article'),
    date: '2026-06-20',
    image: image(jetties, 'A beach'),
    // No body at all: the page must still render its title and the share row.
  })

  // Events: two upcoming, one that ended long ago (must not appear), one spanning days.
  await ensure('event', 'title', 'Miacomet Golf Jamboree', {
    title: 'Miacomet Golf Jamboree',
    start: daysFromNow(10, 14),
    end: daysFromNow(10, 19),
    location: 'Miacomet Golf Course',
    description: 'A fun-filled day on the fairways where golfers of all ages come together.',
  })
  await ensure('event', 'title', 'Coastal Cleanup Day', {
    title: 'Coastal Cleanup Day',
    start: daysFromNow(20, 14),
    end: daysFromNow(20, 21),
    location: 'Cinco Beach',
    description: 'A hands-on opportunity to give back to the shorelines.',
  })
  await ensure('event', 'title', 'A past event (must not appear)', {
    title: 'A past event (must not appear)',
    start: daysFromNow(-30, 14),
    end: daysFromNow(-30, 18),
  })
  await ensure('event', 'title', 'A two-day event with no location', {
    title: 'A two-day event with no location',
    start: daysFromNow(30, 14),
    end: daysFromNow(31, 19),
  })

  // FAQs
  await ensure('faq', 'question', 'Where can I get paper maps?', {
    question: 'Where can I get paper maps?',
    answer: [text('Paper maps are available at our office during regular office hours.')],
    category: weakRef(general, 'faqCategory'),
    order: 10,
  })
  await ensure('faq', 'question', 'Does the Land Bank have a lost and found?', {
    question: 'Does the Land Bank have a lost and found?',
    answer: [text('Yes, please call our office to check on any lost items.')],
    category: weakRef(general, 'faqCategory'),
    order: 20,
  })
  await ensure('faq', 'question', 'Can I process my forms by mail?', {
    question: 'Can I process my forms by mail?',
    answer: [text('Yes, forms can be mailed to our office. Please allow additional processing time.')],
    category: weakRef(filing, 'faqCategory'),
    order: 10,
  })
  await ensure('faq', 'question', 'A question with no category', {
    question: 'A question with no category',
    answer: [text('This one appears first, ungrouped.')],
    order: 5,
  })

  // People (no headshots on purpose)
  await ensure('staffMember', 'name', 'Alex Example', {
    name: 'Alex Example',
    title: 'Executive Director',
    department: weakRef(admin, 'department'),
    order: 10,
  })
  await ensure('staffMember', 'name', 'Sam Sample', {
    name: 'Sam Sample',
    title: 'Property Manager',
    department: weakRef(property, 'department'),
    order: 20,
  })
  await ensure('staffMember', 'name', 'Pat Placeholder', {
    name: 'Pat Placeholder',
    title: 'A staff member with no department',
    order: 30,
  })
  await ensure('commissioner', 'name', 'Jordan Example', {
    name: 'Jordan Example',
    title: 'Chair',
    startDate: '2019-01-15',
    order: 10,
  })
  await ensure('commissioner', 'name', 'Riley Sample', {
    name: 'Riley Sample',
    title: 'Commissioner',
    order: 20,
  })

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} draft document(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
