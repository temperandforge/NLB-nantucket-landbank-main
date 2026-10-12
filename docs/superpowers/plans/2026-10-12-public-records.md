# Public Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Records Archive page block that lists downloadable records under category tabs, where each category chooses its own sort order and filters.

**Architecture:** `record` and `recordCategory` documents in Sanity; the category carries `sortBy` and a `filters` array of keys. A `recordsArchive` page-builder block projects every category and record. All tab, filter, sort and label logic is one pure function (`recordView`) plus a filter registry (`RECORD_FILTERS`) in `frontend/sanity/lib/archiveFilter.ts`, verified by a plain node script. Components only render what `recordView` returns, so a new filter is a registry entry plus one schema option.

**Tech Stack:** Sanity v3/v4 Studio, GROQ + TypeGen, Next.js (App Router, React), Tailwind, plain-node verify scripts (no test framework).

**Spec:** [docs/superpowers/specs/2026-10-12-public-records-design.md](../specs/2026-10-12-public-records-design.md)

## Global Constraints

- **Read the Next.js docs in `node_modules/next/dist/docs/` before any Next.js work** (AGENTS.md). Next here is 16.x; training data is outdated.
- Only singletons get explicit `_id`s. Records, categories and pages let Sanity generate ids; match on a natural key (the category slug) in scripts.
- A taxonomy's slug is its stable key; its title is the label. Never restate category titles or slugs in frontend code; derive them from the query.
- Reuse the shared `components/ui/FilterTabs` and the helpers in `archiveFilter.ts`; do not re-inline them.
- `archiveFilter.ts` stays one self-contained file: `scripts/verifyStaffFilter.mts`-style scripts run it under plain node, which cannot resolve extensionless relative imports, and `tsc` rejects `.ts` ones. Never add an import to it.
- Derive component prop types from generated query result types (`BlockProps<'recordsArchive'>`); do not hand-write them.
- Anything rendered must degrade, never throw: an unpublished category dereferences to null, and a record whose file was deleted has no asset.
- Add design tokens per feature named after their Figma variables; prefer an existing token over raw hex and flag the discrepancy. Icons are inline SVG with `currentColor`. Commit Figma assets; never hotlink them.
- Run seeds via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token`. Seeds are idempotent, state in their header what they overwrite, and have `--dry`.
- After any schema change run `npm run sanity:typegen` in `frontend` and commit `frontend/sanity.types.ts`, `studio/sanity.types.ts` and `sanity.schema.json`.
- Verification: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`. Verify anything visual in the browser. **Stop any dev server you start.** Per `AGENTS.local.md`, do not leave preview servers running and do not start one for the user to review with.
- Every deferred item gets a GitHub issue (`gh issue list --search` first) linked from the spec's "Not in this slice" section.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Work in this worktree (`.claude/worktrees/public-records`, branch `worktree-public-records`). It branched from `origin/main` and lacks the main checkout's uncommitted events work; `BlockRenderer.tsx`, `queries.ts`, `page.ts`, `schemaTypes/index.ts`, `structure/index.ts` and `DECISIONS.md` are touched by both, so expect trivial merge conflicts later.

## Review Focus

The spec implies these inputs; each has a test or browser check in the task named:

1. **`?category=` is unknown, blank or a deleted category** → the first tab is shown, never a blank page (Task 1, browser in Task 6).
2. **`?year=` that the active category does not offer** (a year with no records, a category with no year filter, or a `filters` value the frontend does not know yet) → ignored, the full list shows (Task 1).
3. **A record with no title and no date** → labelled by its file name (then "Untitled record"); an undated record in a date-descending list sorts last and never throws (Task 1).
4. **An unpublished category, a record pointing at one, or a record whose file asset is gone** → absent from every view, the page still renders; zero categories → the block renders nothing (Task 1 for the data rules, Task 4 for the query, Task 6 browser).
5. **Switching tabs while a year is chosen** → the year is cleared, so a stale `?year` cannot leave the new tab empty; a category with no records shows an empty message (Task 1 for the patch, Task 6 browser).

---

### Task 1: Records logic in `archiveFilter.ts`, with a verify script

**Files:**
- Modify: `frontend/sanity/lib/archiveFilter.ts` (append a section at the end of the file)
- Create: `frontend/scripts/verifyRecordsFilter.mts`

**Interfaces:**
- Consumes: existing `Category`, `FilterTab`, `categoryTabs`, `parseFilter` in the same file.
- Produces (all exported from `archiveFilter.ts`):
  - `RECORD_CATEGORY_PARAM = 'category'`, `RECORD_FILTER_LABEL = 'Filter records by category'`
  - `type RecordCategory = Category & {sortBy?: string | null; filters?: ReadonlyArray<string | null> | null}`
  - `type RecordItem = {_id: string; title?: string | null; date?: string | null; fileName?: string | null; fileUrl?: string | null; categorySlug?: string | null}`
  - `RECORD_FILTERS` (registry; today only `year`) and `type RecordFilterKey`
  - `type RecordFilterView = {key: RecordFilterKey; param: string; label: string; options: FilterTab[]; value: string | null}`
  - `type RecordView = {tabs: FilterTab[]; category: RecordCategory | null; filters: RecordFilterView[]; records: RecordItem[]}`
  - `recordView(search: string, categories: ReadonlyArray<RecordCategory | null | undefined>, records: ReadonlyArray<RecordItem>): RecordView`
  - `recordLabel(record: RecordItem): string`
  - `recordCategoryPatch(slug: string): Record<string, string | null>`

- [ ] **Step 1: Write the verify script (it fails: the exports do not exist yet)**

Create `frontend/scripts/verifyRecordsFilter.mts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && node scripts/verifyRecordsFilter.mts`
Expected: FAIL with a `SyntaxError` / "does not provide an export named 'recordCategoryPatch'" (or similar). If Node cannot run `.mts`, check how the other `verify*.mts` scripts are run in the repo (`node --version`; needs type-stripping support) and use the same command.

- [ ] **Step 3: Implement the section at the end of `archiveFilter.ts`**

Append (no new imports):

```ts
// --- Public records: tabs by category, each category sorting and filtering its own way -------

export const RECORD_CATEGORY_PARAM = 'category'
export const RECORD_FILTER_LABEL = 'Filter records by category'

/**
 * A record category with its presentation settings. `sortBy` and `filters` arrive as plain
 * strings: the frontend ignores a value it does not know (a schema deployed before the frontend).
 */
export type RecordCategory = Category & {
  sortBy?: string | null
  filters?: ReadonlyArray<string | null> | null
}

export type RecordItem = {
  _id: string
  title?: string | null
  /** YYYY-MM-DD */
  date?: string | null
  fileName?: string | null
  fileUrl?: string | null
  categorySlug?: string | null
}

type RecordFilterDefinition = {
  /** The query-string parameter. */
  param: string
  label: string
  /** The choices this filter offers for a category's records. */
  options: (records: ReadonlyArray<RecordItem>) => FilterTab[]
  matches: (record: RecordItem, value: string) => boolean
}

const dateParts = (date: string | null | undefined) => /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')

const yearOf = (record: RecordItem) => dateParts(record.date)?.[1] ?? null

/**
 * Every record filter, by the key a category lists in its `filters`. Adding a filter is one entry
 * here plus one allowed value on `recordCategory.filters` in the studio (the two lists cannot
 * share code across packages). Nothing else, including the block and the hook, changes.
 */
export const RECORD_FILTERS = {
  year: {
    param: 'year',
    label: 'Year',
    options: (records) => {
      const years = new Set<string>()
      for (const record of records) {
        const year = yearOf(record)
        if (year) years.add(year)
      }
      return [...years].sort().reverse().map((year) => ({slug: year, title: year}))
    },
    matches: (record, value) => yearOf(record) === value,
  },
} satisfies Record<string, RecordFilterDefinition>

export type RecordFilterKey = keyof typeof RECORD_FILTERS

const isFilterKey = (key: string | null): key is RecordFilterKey =>
  key !== null && Object.prototype.hasOwnProperty.call(RECORD_FILTERS, key)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** A row's text: its title, else its date written out, else its file name. */
export function recordLabel(record: RecordItem): string {
  const title = record.title?.trim()
  if (title) return title
  const date = dateParts(record.date)
  if (date && Number(date[2]) >= 1 && Number(date[2]) <= 12) {
    return `${MONTHS[Number(date[2]) - 1]} ${Number(date[3])}, ${date[1]}`
  }
  return record.fileName?.trim() || 'Untitled record'
}

const compareLabels = (a: RecordItem, b: RecordItem) =>
  recordLabel(a).localeCompare(recordLabel(b), undefined, {sensitivity: 'base', numeric: true})

/** `titleAsc` is A-Z; anything else, including a value this code does not know, is newest first. */
function sortRecords(records: ReadonlyArray<RecordItem>, sortBy: string | null | undefined): RecordItem[] {
  const list = [...records]
  if (sortBy === 'titleAsc') return list.sort(compareLabels)
  // An undated record compares as '' so it sorts last when newest-first.
  return list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || compareLabels(a, b))
}

export type RecordFilterView = {
  key: RecordFilterKey
  param: string
  label: string
  options: FilterTab[]
  value: string | null
}

export type RecordView = {
  tabs: FilterTab[]
  category: RecordCategory | null
  filters: RecordFilterView[]
  records: RecordItem[]
}

/**
 * Everything the Records block shows for an address: the tabs, the active category (the first one
 * when the address names none, or an unknown one), the filters that category offers with their
 * choices, and its records, narrowed by the chosen filters and sorted as the category says.
 * A filter value the category does not offer is ignored.
 */
export function recordView(
  search: string,
  categories: ReadonlyArray<RecordCategory | null | undefined>,
  records: ReadonlyArray<RecordItem>,
): RecordView {
  const tabs = categoryTabs(categories)
  const slug = parseFilter(search, RECORD_CATEGORY_PARAM, tabs) ?? tabs[0]?.slug ?? null
  const category = slug ? (categories.find((candidate) => candidate?.slug?.trim() === slug) ?? null) : null
  if (!slug || !category) return {tabs, category: null, filters: [], records: []}

  const inCategory = records.filter((record) => record.categorySlug === slug)
  const keys = [...new Set(category.filters ?? [])].filter(isFilterKey)
  const filters = keys.map((key): RecordFilterView => {
    const definition = RECORD_FILTERS[key]
    const options = definition.options(inCategory)
    return {key, param: definition.param, label: definition.label, options, value: parseFilter(search, definition.param, options)}
  })

  let visible = inCategory
  for (const filter of filters) {
    const value = filter.value
    if (value) visible = visible.filter((record) => RECORD_FILTERS[filter.key].matches(record, value))
  }
  return {tabs, category, filters, records: sortRecords(visible, category.sortBy)}
}

/**
 * The query-string changes for choosing a category tab: set the category and clear every record
 * filter, so a year chosen on one tab cannot leave the next one empty. Apply with `withFilter`.
 */
export function recordCategoryPatch(slug: string): Record<string, string | null> {
  const cleared = Object.fromEntries(Object.values(RECORD_FILTERS).map((filter) => [filter.param, null]))
  return {...cleared, [RECORD_CATEGORY_PARAM]: slug}
}
```

- [ ] **Step 4: Run the script to verify it passes**

Run: `cd frontend && node scripts/verifyRecordsFilter.mts`
Expected: every line `ok`, ending `all ok`. If a sort assertion fails, re-read `sortRecords`: undated must compare as `''`.

Also run the existing checks, which share the file: `node scripts/verifyStaffFilter.mts && node scripts/verifyPropertyFilter.mts` (both end `all ok`).

- [ ] **Step 5: Type-check and commit**

Run: `cd frontend && npx tsc --noEmit` (if `type-check` is needed for generated route types, `npm run type-check`). Expected: no errors in `archiveFilter.ts` or the script.

```bash
git add frontend/sanity/lib/archiveFilter.ts frontend/scripts/verifyRecordsFilter.mts
git commit -m "feat: record tabs, filter registry and per-category sort

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Studio schema (`recordCategory`, `record`, `recordsArchive`)

**Files:**
- Modify: `studio/src/schemaTypes/documents/taxonomy.ts` (let a taxonomy add fields)
- Modify: `studio/src/schemaTypes/documents/taxonomies.ts` (add `recordCategory`)
- Create: `studio/src/schemaTypes/documents/record.ts`
- Create: `studio/src/schemaTypes/objects/recordsArchive.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/schemaTypes/documents/page.ts`, `studio/src/structure/index.ts`
- Regenerated: `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Consumes: `defineTaxonomy`, `defineBlock`.
- Produces: document types `record` (`title?`, `date?`, `file`, `category`) and `recordCategory` (`title`, `slug`, `order`, `sortBy` in `dateDesc | titleAsc`, `filters` array of `year`); block type `recordsArchive` (no content fields). Values must match Task 1's `RECORD_FILTERS` keys and `sortRecords` values.

- [ ] **Step 1: Install dependencies in this worktree (it has no `node_modules`)**

```bash
cd studio && npm install && cd ../frontend && npm install
```
Expected: both succeed. Do not commit `package-lock.json` changes unless they are real (check `git status`).

- [ ] **Step 2: Let `defineTaxonomy` take extra fields (additive, existing callers unchanged)**

In `studio/src/schemaTypes/documents/taxonomy.ts` change the signature and fields:

```ts
import {defineField, defineType, type DocumentDefinition, type FieldDefinition} from 'sanity'

export function defineTaxonomy({
  name,
  title,
  icon,
  description,
  fields = [],
}: {
  name: string
  title: string
  icon: DocumentDefinition['icon']
  description: string
  /** Settings specific to this taxonomy, after the shared title, slug and order. */
  fields?: FieldDefinition[]
}) {
```

and, in the returned `fields` array, after the `order` field, add `...fields,`.

- [ ] **Step 3: Add `recordCategory`**

In `studio/src/schemaTypes/documents/taxonomies.ts` add `defineArrayMember` and `defineField` to a `sanity` import and `FolderIcon`-or-`DocumentsIcon` to the icons import, then:

```ts
export const recordCategory = defineTaxonomy({
  name: 'recordCategory',
  title: 'Record Category',
  icon: DocumentsIcon,
  description: 'A tab on the Public Records page, e.g. "Meeting Minutes".',
  fields: [
    defineField({
      name: 'sortBy',
      title: 'Order the list by',
      type: 'string',
      options: {
        list: [
          {title: 'Date, newest first', value: 'dateDesc'},
          {title: 'Title, A to Z', value: 'titleAsc'},
        ],
        layout: 'radio',
      },
      initialValue: 'dateDesc',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'filters',
      title: 'Filters',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {list: [{title: 'Year', value: 'year'}]},
      validation: (rule) => rule.unique(),
      description:
        'Filters shown above this tab’s list. Year offers the years the records have, so give those records a date.',
    }),
  ],
})
```

The allowed values here and the keys of `RECORD_FILTERS` in `frontend/sanity/lib/archiveFilter.ts` are the same list in two packages; keep them together.

- [ ] **Step 4: Add `record`**

Create `studio/src/schemaTypes/documents/record.ts`:

```ts
import {DocumentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A public record: one downloadable file under a category. Its row on the site is labelled with
 * the title, else the date, else the file name, so a dated entry (meeting minutes) can leave the
 * title blank and a titled one (a policy) can leave the date blank.
 */
export const record = defineType({
  name: 'record',
  title: 'Record',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional. Shown as the row’s name; when empty the date, then the file name, is used.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'Optional. Used for the year filter and for newest-first ordering.',
      validation: (rule) =>
        rule
          .custom(async (value, context) => {
            if (value) return true
            const categoryId = (context.document as {category?: {_ref?: string}} | undefined)?.category?._ref
            if (!categoryId) return true
            const category = await context
              .getClient({apiVersion: '2025-09-25'})
              .fetch<{sortBy?: string | null; filters?: string[] | null} | null>(
                `*[_id == $id][0]{sortBy, filters}`,
                {id: categoryId},
              )
            const needsDate = (category?.sortBy ?? 'dateDesc') === 'dateDesc' || (category?.filters ?? []).includes('year')
            return needsDate
              ? 'This category orders by date or filters by year, so a record with no date is listed last and never matches a year.'
              : true
          })
          .warning(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'recordCategory'}],
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'date', fileName: 'file.asset.originalFilename', category: 'category.title'},
    prepare: ({title, date, fileName, category}) => ({
      title: title || date || fileName || 'Untitled record',
      subtitle: category,
    }),
  },
})
```

- [ ] **Step 5: Add the block**

Create `studio/src/schemaTypes/objects/recordsArchive.ts`:

```ts
import {DocumentsIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * Every record, under a tab per record category. Which filters a tab shows and how its list is
 * ordered are set on the category, not here, so the block has nothing to configure.
 */
export const recordsArchive = defineBlock({
  name: 'recordsArchive',
  title: 'Records Archive',
  type: 'object',
  icon: DocumentsIcon,
  fields: [],
  preview: {
    prepare: () => ({title: 'Records Archive', subtitle: 'Every public record, by category'}),
  },
})
```

- [ ] **Step 6: Register everything**

- `studio/src/schemaTypes/index.ts`: import `record` from `./documents/record`, `recordCategory` (add to the existing `./documents/taxonomies` import) and `recordsArchive` from `./objects/recordsArchive`. Add `record` after `job`, `recordCategory` after `faqCategory`, and `recordsArchive` after `propertyArchive` in the objects list.
- `studio/src/schemaTypes/documents/page.ts`: import `recordsArchive` and add it to `pageBuilderBlocks` (it sorts itself by title).
- `studio/src/structure/index.ts`: add `'record'` and `'recordCategory'` to `DISABLED_TYPES` (under the "Handled explicitly below" group), and after the FAQs list item add:

```ts
      S.listItem()
        .title('Records')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Records')
            .items([
              S.documentTypeListItem('record').title('Records').icon(DocumentsIcon),
              S.divider(),
              S.documentTypeListItem('recordCategory').title('Record Categories').icon(TagIcon),
            ]),
        ),
```

- [ ] **Step 7: Typegen and type-check**

```bash
cd frontend && npm run sanity:typegen
cd ../studio && npx tsc --noEmit
```
Expected: typegen succeeds and `git status` shows `frontend/sanity.types.ts`, `studio/sanity.types.ts` (if changed) and `sanity.schema.json` modified; `tsc` prints nothing.

- [ ] **Step 8: Commit**

```bash
git add studio/src frontend/sanity.types.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat: record, recordCategory and the Records Archive block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seed script (categories, a draft page, optional samples)

**Files:**
- Create: `studio/scripts/seedRecords.ts`

**Interfaces:**
- Consumes: Task 2's document types.
- Produces: five published `recordCategory` documents, a draft `public-records` page with a Hero - Tertiary and the block, and with `--samples` a few `[Sample]` published records for verification (`--remove-samples` deletes them).

- [ ] **Step 1: Write the script**

Create `studio/scripts/seedRecords.ts`:

```ts
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
    const title = `${SAMPLE_PREFIX}${sample.title ?? sample.date}`
    const exists = await client.fetch<string | null>(`*[_type == "record" && title == $title && category._ref == $category][0]._id`, {title, category})
    if (exists) continue
    await client.create({
      _type: 'record',
      // Dated samples leave the title to the date label only when the title is empty, so they keep
      // the prefix in the title: the prefix is what --remove-samples finds them by.
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
```

- [ ] **Step 2: Type-check and dry run**

```bash
cd studio && npx tsc --noEmit
npx sanity exec scripts/seedRecords.ts --with-user-token -- --dry
```
Expected: `tsc` silent; the dry run lists five `would create category` lines and `would create draft page public-records` (or `exists` lines if re-run), and writes nothing. Read the plan before the real run.

- [ ] **Step 3: Real run, then re-run to prove idempotence**

```bash
npx sanity exec scripts/seedRecords.ts --with-user-token
npx sanity exec scripts/seedRecords.ts --with-user-token
```
Expected: first run creates; second prints only `= exists` lines. (This writes to the dataset the studio is configured for: confirm that is the intended development dataset first.) Verification samples are added in Task 6.

- [ ] **Step 4: Commit**

```bash
git add studio/scripts/seedRecords.ts
git commit -m "feat: seed script for record categories and the Public Records page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The block's GROQ projection

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (next to `_type == "newsArchive"`, around line 251)
- Regenerated: `frontend/sanity.types.ts`

**Interfaces:**
- Consumes: Task 2 types.
- Produces: `block.categories` (`_id`, `title`, `slug`, `order`, `sortBy`, `filters`) and `block.records` (`_id`, `title`, `date`, `fileUrl`, `fileName`, `categorySlug`) on `ExtractPageBuilderType<'recordsArchive'>`, structurally compatible with `RecordCategory[]` and `RecordItem[]` from Task 1.

- [ ] **Step 1: Add the projection**

Insert after the `newsArchive` branch:

```groq
    _type == "recordsArchive" => {
      ...,
      "categories": *[_type == "recordCategory" && defined(slug.current)] | order(order asc, title asc) {
        _id,
        title,
        "slug": slug.current,
        order,
        sortBy,
        filters
      },
      "records": *[
        _type == "record" && defined(file.asset) && defined(category->slug.current)
      ] {
        _id,
        title,
        date,
        "fileUrl": file.asset->url,
        "fileName": file.asset->originalFilename,
        "categorySlug": category->slug.current
      }
    },
```

(Categories come from the category documents, not from the records, so a category with no records still gets its tab. A record is dropped when its file asset is gone or its category is unpublished.)

- [ ] **Step 2: Typegen and type-check**

```bash
cd frontend && npm run sanity:typegen && npm run type-check
```
Expected: no errors; `frontend/sanity.types.ts` now has `categories` and `records` on the `recordsArchive` member of the page-builder union.

- [ ] **Step 3: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts
git commit -m "feat: project categories and records for the Records Archive block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `FilterTabs` without "All", and the multi-parameter hook

**Files:**
- Modify: `frontend/components/ui/FilterTabs.tsx`
- Create: `frontend/components/blocks/useQueryFilters.ts`

**Interfaces:**
- Consumes: `withFilter` from `archiveFilter.ts`.
- Produces: `FilterTabs` prop `showAll?: boolean` (default `true`, so News, Projects and People are unchanged); `useQueryFilters(): {search: string; update(patch: Record<string, string | null>): void}`.

- [ ] **Step 1: Read the docs**

Read the relevant doc in `frontend/node_modules/next/dist/docs/` for `useSearchParams` (and the Suspense requirement on statically rendered pages) before writing the hook.

- [ ] **Step 2: Add `showAll` to `FilterTabs`**

In the props type add:

```ts
  /** The leading "All" tab. Off for a list where a combined view has no sensible order. Default true. */
  showAll?: boolean
```

destructure `showAll = true`, and wrap the existing "All" `<button>` in `{showAll && ( ... )}`. Nothing else changes.

- [ ] **Step 3: Write the hook**

Create `frontend/components/blocks/useQueryFilters.ts`:

```ts
'use client'

import {useSearchParams} from 'next/navigation'

import {withFilter} from '@/sanity/lib/archiveFilter'

/**
 * The address's query string, and a way to change several parameters at once. Like useQueryFilter
 * (one parameter) it is read with useSearchParams and written with the History API, so a filtered
 * view can be shared and no server request is made. `update` sets a parameter to a value, or
 * removes it with null, keeping every other parameter and the hash. Callers need a Suspense
 * boundary above them on a statically rendered page.
 */
export function useQueryFilters() {
  const searchParams = useSearchParams()
  const search = `?${searchParams.toString()}`

  function update(patch: Record<string, string | null>) {
    let query = window.location.search
    for (const [param, value] of Object.entries(patch)) query = withFilter(query, param, value)
    window.history.replaceState(null, '', `${window.location.pathname}${query}${window.location.hash}`)
  }

  return {search, update}
}
```

- [ ] **Step 4: Type-check, lint, commit**

```bash
cd frontend && npm run type-check && npm run lint
git add frontend/components/ui/FilterTabs.tsx frontend/components/blocks/useQueryFilters.ts
git commit -m "feat: FilterTabs can hide All; hook for several query parameters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
Expected: type-check and lint clean (News/Projects/People still render "All": `showAll` defaults on).

---

### Task 6: The block's components, registered, and checked against Figma and in the browser

**Files:**
- Create: `frontend/components/blocks/RecordRow.tsx`, `RecordFilterMenu.tsx`, `RecordsList.tsx`, `RecordsFilter.tsx`, `RecordsArchive.tsx`
- Modify: `frontend/components/BlockRenderer.tsx`

**Interfaces:**
- Consumes: Task 1 (`recordView`, `recordLabel`, `recordCategoryPatch`, `RecordView`, `RecordItem`, `RECORD_FILTER_LABEL`, `RECORD_CATEGORY_PARAM`), Task 4 (`block.categories`, `block.records`), Task 5 (`FilterTabs showAll`, `useQueryFilters`), `DownloadIcon`, `ChevronDownIcon`, `ChevronUpIcon` from `@/components/icons`.
- Produces: `RecordsArchive` (the block, default export), registered as `recordsArchive`.

- [ ] **Step 1: Read the design and the closest existing component**

Load the `figma:figma-design-to-code` skill, then call `get_design_context` (file `jDXhDNzEJS26VpXp9JWzIv`) for: the tab row `2599:13489` (`records page filters`), the year button `2572:12933` (`filter buttons`), the open panel `2599:13631` (`menu`), a row `2591:13250` (`record links`), the list header `1910:13505`, and the mobile list `2591:13363`. Also read `frontend/components/blocks/PropertyFilterMenu.tsx` (the same dropdown look; this one is single-select) and `NewsFilter.tsx` / `NewsArchive.tsx` (the Suspense and layout pattern to follow). Map any raw hex to an existing token and note the discrepancy; commit no hotlinked assets.

- [ ] **Step 2: `RecordRow`**

Create `frontend/components/blocks/RecordRow.tsx` (adjust classes to the Figma context from Step 1: row 74px on desktop; long names wrap to 100px on mobile):

```tsx
import {DownloadIcon} from '@/components/icons'
import {type RecordItem, recordLabel} from '@/sanity/lib/archiveFilter'

/** One record: its name, and a download link spanning the row (Figma: record links). */
export default function RecordRow({record}: {record: RecordItem}) {
  if (!record.fileUrl) return null
  return (
    <li className="border-b border-dusty-heath-800">
      <a
        href={record.fileUrl}
        download
        className="flex min-h-[74px] items-center justify-between gap-6 py-4 font-sans text-body-base text-on-background no-underline"
      >
        <span>{recordLabel(record)}</span>
        <DownloadIcon className="size-6 shrink-0" />
      </a>
    </li>
  )
}
```

- [ ] **Step 3: `RecordFilterMenu`**

Create `frontend/components/blocks/RecordFilterMenu.tsx` by copying the structure of `PropertyFilterMenu.tsx` (button with `aria-expanded`/`aria-controls`, closes on Escape with focus returning to the button, and on a press outside) with these differences: it is single-select, so each option is a `type="radio"` input in a `name`d group, "View All" calls `onChange(null)`, choosing an option calls `onChange(option.slug)`, and the button reads `${label}: ${value}` when a value is set. Props:

```tsx
{
  label: string
  options: FilterTab[]
  value: string | null
  onChange?: (value: string | null) => void
}
```

Render `null` when `options.length === 0`. It stays a separate component rather than a mode on `PropertyFilterMenu`, so the verified Properties filters are not touched.

- [ ] **Step 4: `RecordsList` (presentational, used by both the server fallback and the client)**

Create `frontend/components/blocks/RecordsList.tsx`:

```tsx
import FilterTabs from '@/components/ui/FilterTabs'
import {RECORD_FILTER_LABEL, type RecordView} from '@/sanity/lib/archiveFilter'

import RecordFilterMenu from './RecordFilterMenu'
import RecordRow from './RecordRow'

/**
 * The tabs, the active category's filters and its records (Figma: records page filters, filter
 * buttons, File Name / Download list). Presentational, so the server renders it for the Suspense
 * fallback. Without the handlers the controls do nothing (only until the page has loaded).
 */
export default function RecordsList({
  view,
  onChooseCategory,
  onChooseFilter,
}: {
  view: RecordView
  onChooseCategory?: (slug: string) => void
  onChooseFilter?: (param: string, value: string | null) => void
}) {
  const {tabs, category, filters, records} = view
  if (!category) return null

  return (
    <div className="flex w-full flex-col items-start gap-12 _tf-max-w md:gap-16">
      <FilterTabs
        tabs={tabs}
        active={category.slug ?? null}
        label={RECORD_FILTER_LABEL}
        showAll={false}
        onChoose={onChooseCategory ? (slug) => slug && onChooseCategory(slug) : undefined}
      />
      <div className="tf-px mx-auto flex w-full flex-col gap-8 tf-max-w">
        {filters.map((filter) => (
          <RecordFilterMenu
            key={filter.key}
            label={filter.label}
            options={filter.options}
            value={filter.value}
            onChange={onChooseFilter ? (value) => onChooseFilter(filter.param, value) : undefined}
          />
        ))}
        <div className="flex items-center justify-between border-b border-dusty-heath-800 py-6 font-sans text-body-base text-on-background">
          <span>File Name</span>
          <span>Download</span>
        </div>
        {records.length > 0 ? (
          <ul className="m-0 w-full list-none p-0">
            {records.map((record) => (
              <RecordRow key={record._id} record={record} />
            ))}
          </ul>
        ) : (
          <p className="py-6 font-sans text-body-base text-on-background-subtle">No records in this category yet.</p>
        )}
      </div>
    </div>
  )
}
```

(Reconcile gaps, header-row borders and the filter placement with the Figma context from Step 1; the structure above is the contract, the classes are a starting point.)

- [ ] **Step 5: `RecordsFilter` (client) and `RecordsArchive` (server block)**

Create `frontend/components/blocks/RecordsFilter.tsx`:

```tsx
'use client'

import {RECORD_CATEGORY_PARAM, recordCategoryPatch, recordView, type RecordCategory, type RecordItem} from '@/sanity/lib/archiveFilter'

import RecordsList from './RecordsList'
import {useQueryFilters} from './useQueryFilters'

/** The records with their tabs and filters driven by the address (?category=, ?year=). */
export default function RecordsFilter({categories, records}: {categories: RecordCategory[]; records: RecordItem[]}) {
  const {search, update} = useQueryFilters()
  const view = recordView(search, categories, records)

  return (
    <RecordsList
      view={view}
      onChooseCategory={(slug) => update(recordCategoryPatch(slug))}
      onChooseFilter={(param, value) => update({[param]: value})}
    />
  )
}
```

(Remove the unused `RECORD_CATEGORY_PARAM` import if lint flags it.)

Create `frontend/components/blocks/RecordsArchive.tsx`:

```tsx
import {Suspense} from 'react'

import {recordView} from '@/sanity/lib/archiveFilter'

import RecordsFilter from './RecordsFilter'
import RecordsList from './RecordsList'
import {BlockProps} from './types'

export default function RecordsArchive({block}: BlockProps<'recordsArchive'>) {
  const categories = block.categories ?? []
  const records = block.records ?? []
  // Nothing to show without a category: degrade, do not throw.
  if (categories.length === 0) return null

  return (
    <section className="bg-background py-s6">
      <div className="flex w-full flex-col items-start gap-10 _tf-max-w">
        {/* useSearchParams needs a Suspense boundary on a statically rendered page. The fallback is
            the same view for an address with no query, which is what the server renders, so the
            page does not shift when the client takes over. */}
        <Suspense fallback={<RecordsList view={recordView('', categories, records)} />}>
          <RecordsFilter categories={categories} records={records} />
        </Suspense>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Register the block**

In `frontend/components/BlockRenderer.tsx` add `import RecordsArchive from '@/components/blocks/RecordsArchive'` and `recordsArchive: RecordsArchive,` in `Blocks` (after `propertyArchive`).

- [ ] **Step 7: Static checks**

```bash
cd frontend && npm run sanity:typegen && npm run type-check && npm run lint
node scripts/verifyRecordsFilter.mts
```
Expected: all clean. A type error on `categories`/`records` means the generated shape differs from `RecordCategory[]`/`RecordItem[]`: fix the Task 4 projection or the Task 1 type, not with a cast.

- [ ] **Step 8: Add verification data, then check in the browser**

```bash
cd studio && npx sanity exec scripts/seedRecords.ts --with-user-token -- --samples
```
The seeded page is a draft, so publish it in Studio (or open it in Presentation); then copy `frontend/.env.local` from the main checkout into this worktree's `frontend/` if it is absent (it is gitignored; do not commit it) and start the dev server on a free port (check `lsof -i :3000` first; do not stop one you did not start). Using the browser tools, check at 1440px and 375px against the Figma frames:

- the default tab is Meeting Minutes with no "All" tab; rows newest first; the Year button shows 2025, 2024 and "View All";
- choosing 2025 narrows the list and sets `?year=2025`; reloading that address keeps it;
- **switching to Policies clears `year` from the address** and lists A to Z with no filter button;
- `?category=nope` and `?category=` show the first tab; `?category=policies&year=2024` shows Policies unfiltered;
- Meeting Agendas (one sample) and Establishment Documents (none) show their list or "No records in this category yet.", with no error;
- no console errors; tabs scroll horizontally on mobile; downloading a row requests the file.

- [ ] **Step 9: Clean up and commit**

Stop the dev server you started. Remove the samples:

```bash
cd studio && npx sanity exec scripts/seedRecords.ts --with-user-token -- --remove-samples
```

```bash
git add frontend/components
git commit -m "feat: Records Archive block with category tabs, year filter and download rows

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Record the decisions, correct the spec, file the issues, final verification

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-12-public-records-design.md`

**Interfaces:** none (documentation and GitHub issues).

- [ ] **Step 1: File the deferred-work issues**

For each, first `gh issue list --search "<words>" --state all`; open one only if none matches:

1. Import the real public records from the current site (state: categories and seed exist; records are authored by hand until this).
2. Add search and document-type filters to the Records Archive (state: where each goes: a `RECORD_FILTERS` entry, an allowed value in `recordCategory.filters`, and for document type a new optional `record` reference; nothing in the block changes).
3. Manual ordering within a record category (state: today only date-descending and A-Z; needs Studio drag-ordering or an `order` number on `record`).
4. Pagination of the Records list (state: every record is listed; Annual Reports is about 40).
5. Per-category indexable URLs such as `/public-records/meeting-minutes` (state: the category is `?category=`; would be static routes below the catch-all, per DECISIONS 10.1).

Record the issue numbers.

- [ ] **Step 2: Correct the spec's block paragraph**

In the spec's **Frontend → Block** paragraph, replace the sentence about the projection with: "Its GROQ projection returns two lists: every `recordCategory` with `slug`, `title`, `order`, `sortBy` and `filters` (so a category with no records still gets its tab), and every `record` that has a file and a published category, with its `categorySlug`." Add the issue numbers beside each item under "Not in this slice".

- [ ] **Step 3: Add the DECISIONS entry**

Add a new section at the end of `docs/DECISIONS.md` (number it after the highest existing one: the events work in the main checkout's uncommitted changes is §18, so use 19 and expect a trivial merge), in the file's existing style:

```markdown
## 19. Public records

**Status:** Implemented. Deferred items: see issues #<n>, #<n>, #<n>, #<n>, #<n>.

Design: [the public records spec](superpowers/specs/2026-10-12-public-records-design.md).

### 19.1 One page, one block, categories as documents

The Public Records page is an ordinary CMS page with a Records Archive block (`recordsArchive`); the
five Figma templates are its tab states, not five pages and not a route. `record` is a document
(title, date, file, category); `recordCategory` is a taxonomy, so the client adds a tab without a deploy.
Tabs come from the categories themselves, so an empty category still has its tab; there is no "All"
tab, because the lists mix titled and dated rows under different sort rules.

### 19.2 Per-category behaviour is data; filters are a registry

A category sets `sortBy` (`dateDesc` or `titleAsc`) and `filters` (an array of keys, today `year`).
All of it is applied by `recordView` in `frontend/sanity/lib/archiveFilter.ts`, checked by
`frontend/scripts/verifyRecordsFilter.mts`. A filter is an entry in `RECORD_FILTERS` plus an allowed
value on `recordCategory.filters` in the studio (two lists in two packages, like the page depth in
section 3); a new one needs no change to the block, the hook or the stored documents. A filter value
a category does not offer, or a key the frontend does not know, is ignored.

**Implication:** Changing a category's slug breaks shared `?category=` links; edit the title instead.
A row is labelled by title, else date, else file name, so a record needs only one of them; Studio
warns when a date-ordered or year-filtered category has an undated record.
```

(Match the heading style and numbering of the real file; check whether the section number is still free.)

- [ ] **Step 4: Full verification**

```bash
cd frontend && npm run sanity:typegen && npm run type-check && npm run lint
node scripts/verifyRecordsFilter.mts && node scripts/verifyStaffFilter.mts && node scripts/verifyPropertyFilter.mts
cd ../studio && npx tsc --noEmit
cd ../studio && npx sanity exec scripts/seedRecords.ts --with-user-token -- --dry
```
Expected: everything clean; the dry run lists only `= exists`. `verifyPageRouting.ts` is not needed: the page hierarchy, routes and Presentation config are unchanged. Confirm no dev server is left running (`lsof -i :3000`), and `git status` is clean apart from the commit below.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: record the Public Records decisions and link the deferred issues

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
