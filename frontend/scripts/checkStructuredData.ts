/**
 * Assertions for the pure SEO and structured-data helpers. There is no test framework, so this is
 * run directly: `npx tsx scripts/checkStructuredData.ts` from `frontend`. Exits non-zero on failure.
 */
import assert from 'node:assert/strict'

import {serializeJsonLd} from '../components/JsonLd'
import {faqItemsFromBlocks, faqItemsFromList} from '../sanity/lib/faqs'
import {buildMetadata} from '../sanity/lib/seo'
import {absoluteUrl, getSiteUrl} from '../sanity/lib/siteUrl'
import {
  breadcrumbLd,
  eventLd,
  faqPageLd,
  jobPostingLd,
  newsArticleLd,
  organizationLd,
  placeLd,
  projectLd,
  recordsArchiveLd,
  webPageLd,
  websiteLd,
} from '../sanity/lib/structuredData'

const checks: [string, () => void][] = []
const check = (name: string, fn: () => void) => checks.push([name, fn])

const ORIGIN = 'https://x.org'

check('getSiteUrl rejects non-https', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL
  assert.equal(getSiteUrl({siteUrl: 'http://x.org'}), null)
  assert.equal(getSiteUrl({siteUrl: 'not a url'}), null)
  assert.equal(getSiteUrl(null), null)
})
check('getSiteUrl strips a trailing slash and falls back to env', () => {
  assert.equal(getSiteUrl({siteUrl: 'https://x.org/'}), ORIGIN)
  process.env.NEXT_PUBLIC_SITE_URL = 'https://env.org'
  assert.equal(getSiteUrl({siteUrl: 'http://bad'}), 'https://env.org')
  delete process.env.NEXT_PUBLIC_SITE_URL
})
check('absoluteUrl needs an origin', () => {
  assert.equal(absoluteUrl('/a', null), null)
  assert.equal(absoluteUrl('/a', ORIGIN), 'https://x.org/a')
})
check('buildMetadata derives a canonical and omits unknown description', () => {
  const m = buildMetadata({path: '/a', title: 'T', defaults: {origin: ORIGIN}})
  assert.equal(m.alternates?.canonical, 'https://x.org/a')
  assert.equal(m.title, 'T')
  assert.ok(!('description' in m))
})
check('buildMetadata with no origin has no canonical', () => {
  const m = buildMetadata({path: '/a', title: 'T'})
  assert.equal(m.alternates, undefined)
})
check('seo override beats the derived title and description', () => {
  const m = buildMetadata({seo: {title: 'S', description: 'D'}, title: 'T', description: 'x', path: '/a'})
  assert.deepEqual(m.title, {absolute: 'S'})
  assert.equal(m.description, 'D')
})
check('noIndex emits robots noindex', () => {
  const m = buildMetadata({seo: {noIndex: true}, path: '/a', title: 'T'})
  assert.deepEqual(m.robots, {index: false, follow: true})
  assert.equal(buildMetadata({seo: {noIndex: false}, path: '/a'}).robots, undefined)
})
check('falls back to the default image and description', () => {
  const image = {url: 'https://cdn/x.jpg', alt: '', width: 1200, height: 627}
  const m = buildMetadata({path: '/a', title: 'T', defaults: {origin: ORIGIN, description: 'site', image}})
  assert.equal(m.description, 'site')
  assert.deepEqual(m.openGraph?.images, [image])
})

check('every builder returns null without an origin', () => {
  assert.equal(organizationLd({name: 'N'}, null), null)
  assert.equal(websiteLd({name: 'N'}, null), null)
  assert.equal(newsArticleLd({title: 'T', slug: 's'}, null), null)
  assert.equal(eventLd({title: 'T', slug: 's', start: '2026-11-01T14:00:00Z'}, null), null)
  assert.equal(placeLd({name: 'N', slug: 's'}, null), null)
  assert.equal(projectLd({name: 'N', slug: 's'}, null), null)
  assert.equal(webPageLd({name: 'N', path: '/a'}, null), null)
  assert.equal(breadcrumbLd([{name: 'A', path: '/a'}, {name: 'B', path: '/a/b'}], null), null)
  assert.equal(recordsArchiveLd({path: '/r', records: [{title: 'T', fileUrl: 'https://f/x.pdf'}]}, null), null)
  assert.equal(faqPageLd({path: '/f', items: [{question: 'Q', answer: 'A'}]}, null), null)
})
check('faq: drops a question missing its answer, and is null with none left', () => {
  const ld = faqPageLd({path: '/f', items: [{question: 'Q1', answer: 'A1'}, {question: 'Q2', answer: ' '}, {question: '', answer: 'A3'}]}, ORIGIN)!
  assert.equal(ld['@type'], 'FAQPage')
  assert.equal(ld.url, 'https://x.org/f')
  assert.deepEqual(ld.mainEntity, [{'@type': 'Question', name: 'Q1', acceptedAnswer: {'@type': 'Answer', text: 'A1'}}])
  assert.equal(faqPageLd({path: '/f', items: [{question: 'Q'}]}, ORIGIN), null)
  assert.equal(faqPageLd({path: '/f', items: []}, ORIGIN), null)
})
const answer = (text: string) => [{_type: 'block', _key: 'k', children: [{_type: 'span', _key: 's', text}], markDefs: []}]
check('faq collector: gathers list, accordion and jump-nav items in page order, as plain text', () => {
  const items = faqItemsFromBlocks([
    {_type: 'hero'},
    {_type: 'faqList', ungrouped: [{question: 'U', answer: answer('ua')}], groups: [{faqs: [{question: 'G', answer: answer('ga')}]}]},
    {_type: 'jumpNavContent', content: [{_type: 'faqAccordion', items: [{question: 'J', answer: answer('ja')}]}, {_type: 'block'}]},
    null,
  ])
  assert.deepEqual(items.map((i) => [i.question, i.answer]), [['U', 'ua'], ['G', 'ga'], ['J', 'ja']])
})
check('faq collector: a list tolerates null references and missing answers', () => {
  const items = faqItemsFromList([null, {question: 'P', answer: answer('pa')}, {question: 'No answer'}])
  assert.deepEqual(items.map((i) => [i.question, i.answer]), [['P', 'pa'], ['No answer', undefined]])
  assert.deepEqual(faqItemsFromList(undefined), [])
})
check('event serialises in the site time zone and omits missing end and location', () => {
  const ld = eventLd({title: 'E', slug: 'e', start: '2026-11-01T14:00:00.000Z'}, ORIGIN)!
  // 14:00Z on 1 Nov 2026 is after the clocks go back, so New York is UTC-5.
  assert.equal(ld.startDate, '2026-11-01T09:00:00-05:00')
  assert.ok(!('endDate' in ld))
  assert.ok(!('location' in ld))
  assert.equal(eventLd({title: 'E', slug: 'e', start: '2026-07-01T14:00:00Z'}, ORIGIN)!.startDate, '2026-07-01T10:00:00-04:00')
})
check('event with an end and a location keeps both', () => {
  const ld = eventLd({title: 'E', slug: 'e', start: '2026-07-01T14:00:00Z', end: '2026-07-01T16:00:00Z', location: 'Pier'}, ORIGIN)!
  assert.equal(ld.endDate, '2026-07-01T12:00:00-04:00')
  assert.deepEqual(ld.location, {'@type': 'Place', name: 'Pier'})
  assert.equal(ld.url, 'https://x.org/events/e')
})
const EMPLOYER = {name: 'Land Bank', address: {streetAddress: '2 Fairgrounds Rd', addressLocality: 'Nantucket', addressRegion: 'MA', postalCode: '02554'}}
const JOB = {title: 'Ranger', description: 'Walk the trails.', datePosted: '2026-10-01', location: 'In-Person', employmentType: 'Full Time'}
const NOW = '2026-11-13T10:00:00.000Z'
check('job posting needs an origin, title, description, date posted, employer and address', () => {
  assert.equal(jobPostingLd(JOB, EMPLOYER, '/jobs', null, NOW), null)
  for (const missing of ['title', 'description', 'datePosted'] as const) {
    assert.equal(jobPostingLd({...JOB, [missing]: null}, EMPLOYER, '/jobs', ORIGIN, NOW), null, missing)
  }
  assert.equal(jobPostingLd(JOB, {...EMPLOYER, name: null}, '/jobs', ORIGIN, NOW), null)
  assert.equal(jobPostingLd(JOB, {name: 'Land Bank'}, '/jobs', ORIGIN, NOW), null)
  assert.equal(jobPostingLd(JOB, {name: 'Land Bank', address: {streetAddress: ''}}, '/jobs', ORIGIN, NOW), null)
})
check('job posting maps employment type and omits what is not known', () => {
  const ld = jobPostingLd(JOB, EMPLOYER, '/jobs', ORIGIN, NOW)!
  assert.equal(ld['@type'], 'JobPosting')
  assert.equal(ld.employmentType, 'FULL_TIME')
  assert.equal(ld.url, 'https://x.org/jobs')
  assert.ok(!('validThrough' in ld))
  assert.deepEqual(ld.jobLocation, {'@type': 'Place', address: {'@type': 'PostalAddress', ...EMPLOYER.address}})
  const odd = jobPostingLd({...JOB, employmentType: 'Whenever'}, EMPLOYER, '/jobs', ORIGIN, NOW)!
  assert.ok(!('employmentType' in odd))
  assert.equal(jobPostingLd({...JOB, employmentType: 'Seasonal'}, EMPLOYER, '/jobs', ORIGIN, NOW)!.employmentType, 'TEMPORARY')
})
check('job posting: a remote job and an expired job are left out, an apply-by today is kept', () => {
  assert.equal(jobPostingLd({...JOB, location: 'Remote'}, EMPLOYER, '/jobs', ORIGIN, NOW), null)
  assert.ok(jobPostingLd({...JOB, location: 'Hybrid'}, EMPLOYER, '/jobs', ORIGIN, NOW))
  assert.equal(jobPostingLd({...JOB, validThrough: '2026-11-12'}, EMPLOYER, '/jobs', ORIGIN, NOW), null)
  assert.equal(jobPostingLd({...JOB, validThrough: '2026-11-13'}, EMPLOYER, '/jobs', ORIGIN, NOW)!.validThrough, '2026-11-13')
})
check('place has geo only when it has a location', () => {
  assert.ok(!('geo' in placeLd({name: 'P', slug: 'p'}, ORIGIN)!))
  const ld = placeLd({name: 'P', slug: 'p', location: {lat: 41.28, lng: -70.1}}, ORIGIN)!
  assert.deepEqual(ld.geo, {'@type': 'GeoCoordinates', latitude: 41.28, longitude: -70.1})
})
check('project points at its property by id, and omits about when there is none', () => {
  assert.ok(!('about' in projectLd({name: 'P', slug: 'p'}, ORIGIN)!))
  assert.deepEqual(projectLd({name: 'P', slug: 'p', propertySlug: 'land'}, ORIGIN)!.about, {
    '@id': 'https://x.org/properties/land#place',
  })
})
check('breadcrumb: a grouping crumb has no item, and a single crumb is not a trail', () => {
  const ld = breadcrumbLd([{name: 'Home', path: '/'}, {name: 'About', path: null}, {name: 'History', path: '/about/history'}], ORIGIN)!
  const items = ld.itemListElement as Record<string, unknown>[]
  assert.equal(items[0].item, 'https://x.org/')
  assert.ok(!('item' in items[1]))
  assert.equal(items[2].position, 3)
  assert.equal(breadcrumbLd([{name: 'Home', path: '/'}], ORIGIN), null)
})
check('records: name falls back title, date, file name; date is dateCreated only', () => {
  const ld = recordsArchiveLd(
    {
      name: 'Records',
      path: '/records',
      records: [
        {title: 'Minutes', date: '2026-01-05', fileUrl: 'https://f/a.pdf', mimeType: 'application/pdf', size: 1200},
        {date: '2026-02-02', fileUrl: 'https://f/b.pdf'},
        {fileName: 'c.pdf', fileUrl: 'https://f/c.pdf'},
        {title: 'No file'},
      ],
    },
    ORIGIN,
  )!
  const list = (ld.mainEntity as {itemListElement: {item: Record<string, unknown>}[]}).itemListElement
  assert.equal(list.length, 3)
  assert.equal(list[0].item.name, 'Minutes')
  assert.equal(list[0].item.dateCreated, '2026-01-05')
  assert.ok(!('datePublished' in list[0].item))
  assert.equal(list[0].item.contentSize, '1200 B')
  assert.equal(list[1].item.name, '2026-02-02')
  assert.equal(list[2].item.name, 'c.pdf')
  assert.ok(!('dateCreated' in list[2].item))
  assert.equal(ld.url, 'https://x.org/records')
})
check('organization omits what is empty and needs a name', () => {
  const ld = organizationLd({name: 'Land Bank', organization: {sameAs: ['https://fb.com/x', null], address: {}}}, ORIGIN)!
  assert.deepEqual(ld.sameAs, ['https://fb.com/x'])
  assert.ok(!('address' in ld))
  assert.ok(!('logo' in ld))
  assert.equal(organizationLd({}, ORIGIN), null)
})
check('serialised JSON-LD never contains a raw <', () => {
  const out = serializeJsonLd({name: '</script><b>'})
  assert.ok(!out.includes('<'))
  assert.equal(JSON.parse(out).name, '</script><b>')
})

let failed = 0
for (const [name, fn] of checks) {
  try {
    fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${name}\n${(error as Error).message}`)
  }
}
if (failed) process.exit(1)
console.log(`${checks.length} checks passed`)
