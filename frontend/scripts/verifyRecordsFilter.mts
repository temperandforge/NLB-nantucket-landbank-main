/**
 * Verifies the Public Records tabs, per-category sort and filters. There is no test framework, so
 * this is a plain script:
 *
 *   cd frontend && node scripts/verifyRecordsFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {recordCategoryPatch, recordLabel, recordView, withFilter} from '../sanity/lib/archiveFilter.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const minutes = {slug: 'meeting-minutes', title: 'Meeting Minutes', order: 10, sortBy: 'dateDesc', filters: ['year']}
const agendas = {slug: 'meeting-agendas', title: 'Meeting Agendas', order: 20, sortBy: 'dateDesc', filters: ['year']}
const reports = {slug: 'annual-reports', title: 'Annual Reports', order: 30, sortBy: 'dateDesc', filters: []}
const policies = {slug: 'policies', title: 'Policies', order: 40, sortBy: 'titleAsc', filters: []}
const categories = [policies, minutes, reports, agendas] // deliberately out of order

const records = [
  {_id: 'm1', date: '2025-03-12', categorySlug: 'meeting-minutes', fileName: 'a.pdf'},
  {_id: 'm2', date: '2024-11-05', categorySlug: 'meeting-minutes'},
  {_id: 'm3', date: '2025-07-01', categorySlug: 'meeting-minutes'},
  {_id: 'm4', categorySlug: 'meeting-minutes', fileName: 'undated.pdf'},
  {_id: 'p1', title: 'Zoning policy', categorySlug: 'policies'},
  {_id: 'p2', title: 'access policy', categorySlug: 'policies'},
  {_id: 'p3', title: 'Budget policy', categorySlug: 'policies'},
  {_id: 'r1', date: '2023-12-31', categorySlug: 'annual-reports'},
  {_id: 'g1', title: 'Orphan', categorySlug: 'ghost'},
  {_id: 'g2', title: 'No category'},
]
const ids = (view: {records: {_id: string}[]}) => view.records.map((record) => record._id)

// Tabs
const first = recordView('', categories, records)
same(
  first.tabs.map((tab) => tab.slug),
  ['meeting-minutes', 'meeting-agendas', 'annual-reports', 'policies'],
  'tabs are the categories in their own order, with no All tab',
)
same(first.category?.slug, 'meeting-minutes', 'no ?category= shows the first tab')
same(recordView('?category=nope', categories, records).category?.slug, 'meeting-minutes', 'an unknown category shows the first tab')
same(recordView('?category=', categories, records).category?.slug, 'meeting-minutes', 'a blank category shows the first tab')
same(recordView('?category=policies', categories, records).category?.slug, 'policies', 'a known category is chosen')

// Sorting
same(ids(first), ['m3', 'm1', 'm2', 'm4'], 'date descending, undated last')
same(ids(recordView('?category=policies', categories, records)), ['p2', 'p3', 'p1'], 'title A-Z ignores case')
same(
  ids(recordView('?category=annual-reports', categories, records)),
  ['r1'],
  'a record belongs only to its own category (orphans and uncategorised records never appear)',
)

// Year filter
same(first.filters.map((filter) => filter.key), ['year'], 'a category with the year filter offers it')
same(first.filters[0].options.map((option) => option.slug), ['2025', '2024'], 'years are those present in the category, newest first')
same(ids(recordView('?year=2024', categories, records)), ['m2'], 'the year narrows the list')
same(recordView('?year=2024', categories, records).filters[0].value, '2024', 'the active year is reported')
same(ids(recordView('?year=1999', categories, records)), ['m3', 'm1', 'm2', 'm4'], 'a year with no records is ignored')
same(recordView('?year=1999', categories, records).filters[0].value, null, 'an ignored year reports no value')
same(
  ids(recordView('?category=policies&year=2024', categories, records)),
  ['p2', 'p3', 'p1'],
  'a year on a category with no year filter is ignored',
)
same(recordView('?category=policies', categories, records).filters, [], 'a category with no filters shows none')

// Unknown or repeated filter keys
const odd = {slug: 'odd', title: 'Odd', filters: ['year', 'search', null, 'year']}
same(recordView('', [odd], []).filters.map((filter) => filter.key), ['year'], 'unknown, null and repeated keys are ignored')

// Empty states
const empty = recordView('?category=meeting-agendas', categories, records)
same([empty.category?.slug, empty.records, empty.filters[0].options], ['meeting-agendas', [], []], 'a category with no records is an empty list, not an error')
same(
  [recordView('', [], records).category, recordView('', [], records).records],
  [null, []],
  'no categories gives no view',
)
same(recordView('', [null, undefined, {slug: '', title: 'x'}], records).category, null, 'unusable categories give no tabs')

// Labels
same(recordLabel({_id: 'x', title: '  Bylaws  ', date: '2025-03-12'}), 'Bylaws', 'a title wins and is trimmed')
same(recordLabel({_id: 'x', date: '2025-03-12'}), 'March 12, 2025', 'a date is written out')
same(recordLabel({_id: 'x', date: '2025-13-01', fileName: 'f.pdf'}), 'f.pdf', 'an invalid date falls back to the file name')
same(recordLabel({_id: 'x', title: ' ', fileName: 'f.pdf'}), 'f.pdf', 'a blank title falls back')
same(recordLabel({_id: 'x'}), 'Untitled record', 'nothing at all still has a label')

// Changing tab clears the filters
same(recordCategoryPatch('policies'), {year: null, category: 'policies'}, 'a tab change clears every record filter')
const patched = Object.entries(recordCategoryPatch('policies')).reduce(
  (search, [param, value]) => withFilter(search, param, value),
  '?category=meeting-minutes&year=2024&x=1',
)
same(patched, '?x=1&category=policies', 'applying it keeps unrelated parameters')

if (failed) {
  console.error('\nFAILED')
  process.exit(1)
}
console.log('\nall ok')
