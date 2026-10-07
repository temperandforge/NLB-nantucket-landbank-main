# Staff, Commissioners and FAQ archives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The theme's staff, commissioner and FAQ archives exist as CMS pages built from blocks, with the Figma staff and FAQ designs, and the footer's Staff and FAQs links point at them.

**Architecture:** No new routes. The People Grid block gains a department filter (a pure helper plus a small client component); the FAQ List block gets the Figma intro and open state; two seed scripts create the three draft pages and wire the footer links.

**Tech Stack:** Sanity Studio, Next.js 16 (read `node_modules/next/dist/docs/` before Next work), Tailwind v4, `next-sanity`, `sanity typegen`.

**Spec:** [docs/superpowers/specs/2026-10-07-staff-commissioner-faq-archives-design.md](../specs/2026-10-07-staff-commissioner-faq-archives-design.md). Figma (Website file `jDXhDNzEJS26VpXp9JWzIv`): staff `1910:12263`, FAQs `1637:6094`. Earlier plans for context: [phase B](2026-10-07-absorb-nlb-design-phase-b.md).

## Global Constraints

- All earlier constraints hold: reuse the shared `link` object; tokens named after Figma variables; Figma assets committed; anything rendered degrades, never throws; types derive from generated query results; GROQ fragments are **constants**; enum-like strings go through `stegaClean`; no Tailwind class built by interpolation; mobile base with desktop behind `md:`/`lg:`; only singletons get explicit `_id`s; a link that does not resolve, or is `#`, renders no link (`realHref`); a reference to an unpublished document dereferences to null, so consumers filter nulls.
- Taxonomy values are never restated in frontend code: department tabs come from the staff data.
- Generated files are tracked: run `npm run sanity:typegen` in `frontend` after schema or query changes and commit the result.
- Verification gate for every task: `npm run sanity:typegen`, `npm run type-check`, `npm run lint`, the check scripts (`verifyJumpNav`, `verifyFluidTokens`, `verifyDates`, `verifyShare`, and from Task 1 `verifyStaffFilter`) in `frontend`; `npx tsc --noEmit` and `npx sanity schema validate` in `studio`. Run them as separate commands, each under the tool timeout. Task 1 recreates `.superpowers/verify.sh` to run them.
- Writing to the Sanity dataset (the seed scripts) needs the user's say-so in chat first; they write drafts, `--dry` first. The menu script edits an existing published document and needs the same say-so.
- The shell refuses network downloads. Do not leave a dev server running.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: the WordPress content import (#11), redirects (#9), FAQ pagination or search, a Figma-checked Commissioners design.

## Decisions made in this plan

| Topic | Decision |
|---|---|
| Filter state | Which department is chosen lives in the address (`?department=<slug>`). The page reads it with `useSearchParams` (inside `Suspense`, whose fallback is the unfiltered grid, so the server HTML is "All") and changes it with `window.history.replaceState`, which Next keeps in sync with `useSearchParams`. No navigation, no server request. |
| Tabs | Derived from the staff on the block, by a pure helper: one per department with at least one member, ordered by the department's `order` then title. Staff with no department appear only under All. An unknown `?department=` is treated as All. |
| Tab control | Buttons with `aria-pressed` (a filter, not page navigation); the row scrolls sideways on a narrow screen. |
| FAQ open state | The card keeps its colour and the answer sits in a lighter panel inside it (Figma open state), 12px below the question. |
| Rich-text size | `.rich-text-basic` reads a `--rich-text-size` property, like `--rich-text-color`, because a Tailwind size class cannot override that unlayered stylesheet. |
| Pages' parent | The seed looks up the existing `about-us` page and uses a weak reference to it. It creates no parent. |
| Footer links | `linkArchivePagesInMenus.ts` requires the three pages to be **published** (a strong link to a draft is rejected, and a weak one would show as no link), and the Footer Menu to have no unpublished edits. |

## Review Focus

1. **Filter.** A department with no staff never gets a tab; staff with no department appear only under All; `?department=` unknown, blank or repeated; `showFilters` off shows no tabs; the server render is "All", so hydration matches. Pinned by `verifyStaffFilter.mts` (Task 1) and Task 2.
2. **Empty data.** No staff, no commissioners, no FAQs: the block renders nothing and the page shows its header only. Pinned in Tasks 2 and 3.
3. **FAQ accordion.** Open and close by keyboard; several open at once; the description absent; ungrouped and grouped FAQs; answer links resolve. Pinned in Task 3.
4. **Seed safety.** Drafts only; idempotent per parent and slug; `--dry` writes nothing; the menu script touches only `#` links labelled Staff or FAQs under About Us, and refuses unpublished pages or a menu with a draft. Pinned in Task 4.
5. **Layout.** The filter row on a narrow screen; the staff grid's column counts; the no-photo box colour; the FAQ columns below `lg`. Pinned in Tasks 2 and 3; compared to Figma by the user (#15).

## File Structure

**Create:** `frontend/sanity/lib/staffFilter.ts`, `frontend/scripts/verifyStaffFilter.mts`; `frontend/components/blocks/{StaffFilter,StaffGrid}.tsx`; `studio/scripts/{seedArchivePages,linkArchivePagesInMenus}.ts`.

**Modify:** `studio/src/schemaTypes/objects/{peopleGrid,faqList}.ts`; `frontend/sanity/lib/queries.ts`; `frontend/components/blocks/{PeopleGrid,FaqList,FaqItem}.tsx`; `frontend/components/cards/{CardStaff,CardCommissioner}.tsx`; `frontend/css/ui.css`; `docs/DECISIONS.md`.

---

### Task 1: The staff filter helper

**Files:**
- Create: `.superpowers/verify.sh` (untracked), `frontend/sanity/lib/staffFilter.ts`, `frontend/scripts/verifyStaffFilter.mts`

**Interfaces:**
- Produces `DepartmentTab = {slug: string; title: string}`; `departmentTabs(people): DepartmentTab[]`; `filterByDepartment<T>(people: T[], slug: string | null): T[]`; `parseDepartment(search: string, tabs): string | null`; `departmentSearch(slug: string | null): string`. A person is `{department?: {slug?: string | null; title?: string | null; order?: number | null} | null}`.

- [ ] **Step 1: Recreate the gate script**

```bash
cat > .superpowers/verify.sh <<'EOF'
#!/bin/bash
set -e
cd /Users/jtf/Developer/NLB-nantucket-landbank-main/frontend
npm run type-check
npm run lint
node scripts/verifyJumpNav.mts
node scripts/verifyFluidTokens.mts
node scripts/verifyDates.mts
node scripts/verifyShare.mts
[ -f scripts/verifyStaffFilter.mts ] && node scripts/verifyStaffFilter.mts
cd ../studio && npx tsc --noEmit
npx sanity schema validate
EOF
chmod +x .superpowers/verify.sh
```

- [ ] **Step 2: Write the failing script**

`frontend/scripts/verifyStaffFilter.mts`:

```ts
/**
 * Verifies the staff department filter. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyStaffFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {
  departmentSearch,
  departmentTabs,
  filterByDepartment,
  parseDepartment,
} from '../sanity/lib/staffFilter.ts'

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

const admin = {slug: 'administration', title: 'Administration', order: 10}
const env = {slug: 'environmental', title: 'Environmental', order: 20}
const prop = {slug: 'property-management', title: 'Property Management', order: 30}
const people = [
  {name: 'a', department: prop},
  {name: 'b', department: admin},
  {name: 'c', department: admin},
  {name: 'd', department: null},
  {name: 'e'},
  {name: 'f', department: env},
]

same(
  departmentTabs(people),
  [
    {slug: 'administration', title: 'Administration'},
    {slug: 'environmental', title: 'Environmental'},
    {slug: 'property-management', title: 'Property Management'},
  ],
  'tabs are the departments that have staff, once each, in department order',
)
same(departmentTabs([]), [], 'no staff gives no tabs')
same(
  departmentTabs([{department: {slug: '', title: 'Blank slug'}}, {department: {slug: 'x', title: ' '}}]),
  [],
  'a department with no slug or no title gets no tab',
)
same(
  departmentTabs([
    {department: {slug: 'zeta', title: 'Zeta'}},
    {department: {slug: 'alpha', title: 'Alpha'}},
    {department: {slug: 'ordered', title: 'Ordered', order: 1}},
  ]),
  [
    {slug: 'ordered', title: 'Ordered'},
    {slug: 'alpha', title: 'Alpha'},
    {slug: 'zeta', title: 'Zeta'},
  ],
  'a department with no order comes after ordered ones, then by title',
)

same(filterByDepartment(people, null).length, 6, 'no filter keeps everyone, including people with no department')
same(
  filterByDepartment(people, 'administration').map((p) => p.name),
  ['b', 'c'],
  'a department filter keeps only its members',
)
same(filterByDepartment(people, 'nobody-here'), [], 'a department with no members gives an empty list')

const tabs = departmentTabs(people)
same(parseDepartment('?department=environmental', tabs), 'environmental', 'a known department is read from the address')
same(parseDepartment('?department=nope', tabs), null, 'an unknown department is ignored')
same(parseDepartment('?department=', tabs), null, 'a blank department is ignored')
same(parseDepartment('', tabs), null, 'no query is no filter')
same(parseDepartment('?department=administration&department=environmental', tabs), 'administration', 'a repeated parameter uses the first')
same(departmentSearch(null), '', 'no filter has no query')
same(departmentSearch('property-management'), '?department=property-management', 'a filter becomes a query')
same(departmentSearch('a b&c'), '?department=a%20b%26c', 'the slug is encoded')

if (failed) process.exit(1)
```

- [ ] **Step 3: Run it and watch it fail**

Run: `cd frontend && node scripts/verifyStaffFilter.mts`
Expected: FAIL with `Cannot find module '.../sanity/lib/staffFilter.ts'`.

- [ ] **Step 4: Implement**

`frontend/sanity/lib/staffFilter.ts`:

```ts
export type DepartmentTab = {slug: string; title: string}

type WithDepartment = {
  department?: {slug?: string | null; title?: string | null; order?: number | null} | null
}

/**
 * The department tabs for a list of staff: one per department that has at least one member, in the
 * department's own order and then by title. A department with no slug or title (an unpublished
 * department dereferences to null) gets no tab, and neither do staff with no department: they
 * appear only under "All".
 */
export function departmentTabs(people: ReadonlyArray<WithDepartment>): DepartmentTab[] {
  const found = new Map<string, {title: string; order: number}>()
  for (const {department} of people) {
    const slug = department?.slug?.trim()
    const title = department?.title?.trim()
    if (!slug || !title || found.has(slug)) continue
    found.set(slug, {title, order: department?.order ?? Number.MAX_SAFE_INTEGER})
  }
  return [...found.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[1].title.localeCompare(b[1].title))
    .map(([slug, {title}]) => ({slug, title}))
}

export function filterByDepartment<T extends WithDepartment>(people: T[], slug: string | null): T[] {
  return slug ? people.filter((person) => person.department?.slug === slug) : people
}

/** The department chosen in an address's query string, or null when absent, blank or unknown. */
export function parseDepartment(search: string, tabs: ReadonlyArray<DepartmentTab>): string | null {
  const value = new URLSearchParams(search).get('department')
  return value && tabs.some((tab) => tab.slug === value) ? value : null
}

export function departmentSearch(slug: string | null): string {
  return slug ? `?department=${encodeURIComponent(slug)}` : ''
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `cd frontend && node scripts/verifyStaffFilter.mts`
Expected: every line `ok`, exit 0.

- [ ] **Step 6: Gate and commit**

Run the gate commands (separately).

```bash
git add frontend/sanity/lib/staffFilter.ts frontend/scripts/verifyStaffFilter.mts
git commit -m "feat: add the staff department filter helpers with a verification script

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: People Grid with a department filter

**Files:**
- Create: `frontend/components/blocks/StaffGrid.tsx`, `frontend/components/blocks/StaffFilter.tsx`
- Modify: `studio/src/schemaTypes/objects/peopleGrid.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/blocks/PeopleGrid.tsx`, `frontend/components/cards/CardStaff.tsx`, `frontend/components/cards/CardCommissioner.tsx`

**Interfaces:**
- Consumes: Task 1 helpers; `CardStaff`, `CardCommissioner`, `StaffItem` (`components/cards/types`).
- Produces: `peopleGrid.showFilters` (boolean); the staff query's `department` also returns `order`; `StaffGrid({people})` (a list, no state) and `StaffFilter({people, showFilters})` (client).

- [ ] **Step 1: Read the docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` (static rendering and `Suspense`, and the "Updating searchParams" section on the native History API).

- [ ] **Step 2: Schema**

In `peopleGrid.ts`, add after the `source` field:

```ts
    defineField({
      name: 'showFilters',
      title: 'Show department tabs',
      type: 'boolean',
      initialValue: false,
      description:
        'Adds an All tab and a tab per department above the staff. The chosen department is kept in the address, so a filtered view can be shared.',
      hidden: ({parent}) => parent?.source !== 'staff',
    }),
```

- [ ] **Step 3: Query**

In the `peopleGrid` branch of `pageBuilderFields`, change the staff projection's department to include its order:

```ts
        "department": department->{"slug": slug.current, title, order}
```

- [ ] **Step 4: Typegen**

Run: `cd frontend && npm run sanity:typegen`

- [ ] **Step 5: Card tweaks (Figma: a person with no photo is a neutral grey box)**

In `CardStaff.tsx` and `CardCommissioner.tsx` change the photo box's `bg-dusty-heath-800` to `bg-on-background-tonal`.

- [ ] **Step 6: The grid and the filter**

`frontend/components/blocks/StaffGrid.tsx` (a plain list, usable in both a server and a client component):

```tsx
import CardStaff from '@/components/cards/CardStaff'
import type {StaffItem} from '@/components/cards/types'

/** The staff, 4 columns at lg. Figma: 12px between columns, 64px between rows. */
export default function StaffGrid({people}: {people: StaffItem[]}) {
  return (
    <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-16 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {people.map((person) => (
        <li key={person._id}>
          <CardStaff person={person} />
        </li>
      ))}
    </ul>
  )
}
```

`frontend/components/blocks/StaffFilter.tsx`:

```tsx
'use client'

import {useSearchParams} from 'next/navigation'

import type {StaffItem} from '@/components/cards/types'
import {
  departmentSearch,
  departmentTabs,
  filterByDepartment,
  parseDepartment,
} from '@/sanity/lib/staffFilter'

import StaffGrid from './StaffGrid'

const TAB =
  'cursor-pointer whitespace-nowrap text-headline-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moody-moor-500'

/**
 * The staff with department tabs (Figma: All, then each department). The chosen department lives
 * in the address as ?department=<slug>, so a filtered view can be shared. It is read with
 * useSearchParams and changed with the History API, which Next keeps in sync: no navigation and no
 * server request. The tabs are buttons with a pressed state, not page links.
 */
export default function StaffFilter({
  people,
  showFilters,
}: {
  people: StaffItem[]
  showFilters: boolean
}) {
  const searchParams = useSearchParams()
  const tabs = departmentTabs(people)

  if (!showFilters || tabs.length === 0) return <StaffGrid people={people} />

  const active = parseDepartment(`?${searchParams.toString()}`, tabs)

  function choose(slug: string | null) {
    window.history.replaceState(null, '', departmentSearch(slug) || window.location.pathname)
  }

  return (
    <div className="flex w-full flex-col items-start gap-16">
      <div
        role="group"
        aria-label="Filter staff by department"
        className="flex w-full items-center gap-10 overflow-x-auto pb-1"
      >
        <button
          type="button"
          aria-pressed={active === null}
          onClick={() => choose(null)}
          className={`${TAB} ${active === null ? 'text-on-background' : 'text-on-background-subtle'}`}
        >
          All
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            aria-pressed={active === tab.slug}
            onClick={() => choose(tab.slug)}
            className={`${TAB} ${active === tab.slug ? 'text-on-background' : 'text-on-background-subtle'}`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <StaffGrid people={filterByDepartment(people, active)} />
    </div>
  )
}
```

Replace `PeopleGrid.tsx` (the commissioners list takes the same gaps as staff):

```tsx
import {Suspense} from 'react'

import CardCommissioner from '@/components/cards/CardCommissioner'

import StaffFilter from './StaffFilter'
import StaffGrid from './StaffGrid'
import {BlockProps} from './types'

export default function PeopleGrid({block}: BlockProps<'peopleGrid'>) {
  const staff = block.staff ?? []
  const commissioners = block.commissioners ?? []
  if (staff.length === 0 && commissioners.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        {staff.length > 0 && (
          // useSearchParams needs a Suspense boundary on a statically rendered page; the fallback
          // is the unfiltered grid, so the server HTML is "All" and hydration matches.
          <Suspense fallback={<StaffGrid people={staff} />}>
            <StaffFilter people={staff} showFilters={Boolean(block.showFilters)} />
          </Suspense>
        )}
        {commissioners.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-16 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {commissioners.map((person) => (
              <li key={person._id}>
                <CardCommissioner person={person} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Gate and build**

Run the gate commands (separately), then `cd frontend && NODE_ENV=production npx next build 2>&1 | tail -25`.
Expected: all pass. If the build reports a `useSearchParams` Suspense error or the routes become dynamic, the `Suspense` boundary is wrong: fix it, do not remove `useSearchParams`. If lint flags `react-hooks` rules in `StaffFilter`, restructure rather than disabling the rule.

- [ ] **Step 8: Commit**

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: add department tabs to the people grid and match the Figma staff grid

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: FAQ List to the Figma design

**Files:**
- Modify: `studio/src/schemaTypes/objects/faqList.ts`, `frontend/components/blocks/{FaqList,FaqItem}.tsx`, `frontend/css/ui.css`

**Interfaces:**
- Produces: `faqList.description` (text); `.rich-text-basic` reads `--rich-text-size`.

- [ ] **Step 1: Schema**

In `faqList.ts` add after `heading`:

```ts
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Shown under the heading, e.g. "Have questions? No worries, we have the answers."',
    }),
```

Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 2: The rich-text size hook**

In `ui.css`, in the `.rich-text-basic` rule change `font-size: var(--text-body-base);` to `font-size: var(--rich-text-size, var(--text-body-base));`.

- [ ] **Step 3: `FaqItem` open state (Figma 1686:11838)**

In `FaqItem.tsx` change the card's outer `div` class to `flex w-full flex-col items-start gap-3 overflow-clip rounded bg-surface-dark p-6 text-left` and the answer wrapper to:

```tsx
      <div
        id={answerId}
        hidden={!open}
        className="w-full rounded bg-warm-neutral-50 px-[31px] py-[26px]"
      >
        {children}
      </div>
```

(The answer's lighter panel sits 12px under the question; a closed item hides it, so it adds no gap.)

- [ ] **Step 4: `FaqList` (Figma 1637:6094)**

Replace the body of `FaqRows` and `FaqList` so that: rows are `gap-3` (12px); the answer's rich text gets `className="[--rich-text-color:var(--color-on-background)] [--rich-text-size:14px]"`; the heading is `text-headline-2xl` (80px); the description sits under it as `font-sans text-body-large leading-[1.6] text-on-background`; the left column is `lg:w-[318px]`; the list column is `lg:w-[668px]`. The section structure:

```tsx
      <div className="relative z-10 mx-auto flex w-full max-w-[85rem] flex-col items-start gap-10 lg:flex-row lg:justify-between">
        {(block.heading || block.description) && (
          <div className="flex w-full flex-col items-start gap-6 lg:w-[318px] lg:shrink-0">
            {block.heading && (
              <h2 className="w-full text-headline-2xl text-on-background">{block.heading}</h2>
            )}
            {block.description && (
              <p className="w-full font-sans text-body-large leading-[1.6] text-on-background">
                {block.description}
              </p>
            )}
          </div>
        )}
        <div className="flex w-full flex-col items-start gap-16 lg:w-[668px] lg:shrink-0">
          {/* the existing ungrouped list and groups, unchanged */}
        </div>
      </div>
```

The `{/* … */}` line is an instruction: keep the existing ungrouped and group markup there; leaving the comment behind is a defect.

- [ ] **Step 5: Gate, build, commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build`.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: match the FAQ list to the Figma FAQ archive

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The archive pages, the footer links, docs and final verification

**Files:**
- Create: `studio/scripts/seedArchivePages.ts`, `studio/scripts/linkArchivePagesInMenus.ts`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: The page seed**

`studio/scripts/seedArchivePages.ts`:

```ts
/**
 * Creates the Staff, Commissioners and FAQs pages as DRAFTS under the existing About Us page, each
 * built from blocks (the theme's archives: a header, then the people or the questions).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedArchivePages.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedArchivePages.ts --with-user-token
 *
 * What it writes: three draft `page` documents (Sanity generates every id) and, for the FAQs hero,
 * one uploaded sample photo (content-addressed, so re-running reuses it; replace it in Studio).
 * Idempotent: a page is matched on its slug under the About Us page, in any state, and skipped if
 * it exists. It never edits an existing page and creates no parent: it stops if About Us is
 * missing. The parent reference is weak, so it holds whether or not About Us is published.
 *
 * The header copy is the theme's own defaults. The pages show whatever staff, commissioner and FAQ
 * documents exist (see seedPhaseBContent.ts for samples); importing the real ones is #11.
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
const published = (id: string) => id.replace(/^drafts\./, '')

const STAFF_BODY =
  "The Land Bank staff works every day to protect, manage, and open Nantucket's natural landscapes to the public. From stewardship and trail maintenance to land acquisition and community programming, our team brings deep knowledge of the island and a genuine commitment to keeping it wild, working, and accessible for everyone who calls Nantucket home."
const COMMISSIONER_BODY =
  "The Land Bank is governed by a five-member Board of Commissioners, elected by Nantucket voters to oversee the acquisition, management, and stewardship of the island's protected lands. Commissioners bring a range of backgrounds and a shared commitment to conservation, working alongside Land Bank staff to ensure that every acre we protect continues to serve the community."

async function uploadSampleImage() {
  if (DRY_RUN) return 'dry-image'
  const path = resolve(__dirname, '../../frontend/public/images/properties/long-pond.jpg')
  return (await client.assets.upload('image', createReadStream(path), {filename: 'long-pond.jpg'}))._id
}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "about-us"][0]._id`,
  )
  if (!parent) {
    console.error('There is no "about-us" page to put the archives under. Nothing was written.')
    process.exit(1)
  }
  const parentId = published(parent)

  const pages: Array<{slug: string; name: string; blocks: () => Promise<unknown[]>}> = [
    {
      slug: 'staff',
      name: 'Staff',
      blocks: async () => [
        {_type: 'heroTertiary', _key: key(), eyebrow: 'Staff', heading: 'Meet our staff', headingLevel: 'h1', body: STAFF_BODY},
        {_type: 'peopleGrid', _key: key(), source: 'staff', showFilters: true},
      ],
    },
    {
      slug: 'commissioners',
      name: 'Commissioners',
      blocks: async () => [
        {_type: 'heroTertiary', _key: key(), eyebrow: 'Commissioners', heading: 'Meet our Commissioners', headingLevel: 'h1', body: COMMISSIONER_BODY},
        {_type: 'peopleGrid', _key: key(), source: 'commissioners'},
      ],
    },
    {
      slug: 'faqs',
      name: 'FAQs',
      blocks: async () => [
        {
          _type: 'heroImage',
          _key: key(),
          eyebrow: 'FAQs',
          heading: 'Have questions? We have the answers.',
          image: {
            _type: 'image',
            asset: {_type: 'reference', _ref: await uploadSampleImage()},
            alt: 'A Land Bank property',
          },
        },
        {
          _type: 'faqList',
          _key: key(),
          heading: 'FAQs',
          description: 'Have questions? No worries, we have the answers.',
        },
      ],
    },
  ]

  let created = 0
  for (const page of pages) {
    const exists = await client.fetch<string | null>(
      `*[_type == "page" && slug.current == $slug && parent._ref == $parent][0]._id`,
      {slug: page.slug, parent: parentId},
    )
    if (exists) {
      console.log(`  = exists: about-us/${page.slug} (${exists})`)
      continue
    }
    created += 1
    if (DRY_RUN) {
      console.log(`[dry run] would create draft page about-us/${page.slug}`)
      continue
    }
    const result = await client.create({
      _id: 'drafts.',
      _type: 'page',
      name: page.name,
      slug: {_type: 'slug', current: page.slug},
      parent: {
        _type: 'reference',
        _ref: parentId,
        _weak: true,
        _strengthenOnPublish: {type: 'page'},
      },
      pathOnly: false,
      pageBuilder: await page.blocks(),
    } as never)
    console.log(`  + created draft: about-us/${page.slug} (${result._id})`)
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} draft page(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Run: `cd studio && npx tsc --noEmit && npx sanity exec scripts/seedArchivePages.ts --with-user-token -- --dry`
Expected: type-check passes; the dry run lists the three pages (or "exists") and writes nothing. If it stops because there is no `about-us` page, report that to the user.

- [ ] **Step 2: The footer link script**

`studio/scripts/linkArchivePagesInMenus.ts`:

```ts
/**
 * Points the footer menu's Staff and FAQs links (placeholders: `#`) at the new archive pages.
 *
 * Run from the studio directory, after the three pages are PUBLISHED:
 *   npx sanity exec scripts/linkArchivePagesInMenus.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkArchivePagesInMenus.ts --with-user-token
 *
 * What it overwrites: only a link under "About Us" in the "Footer Menu" that is labelled Staff or
 * FAQs and is still a `#` placeholder; every other item is left exactly as it is. Each change is
 * printed first. It stops, writing nothing, if a target page is not published (a link to a draft is
 * rejected by the API) or if the menu has unpublished edits (publish or discard them first, so
 * this does not overwrite them).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const TARGETS: Array<{label: string; slug: string}> = [
  {label: 'Staff', slug: 'staff'},
  {label: 'FAQs', slug: 'faqs'},
]

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "about-us" && !(_id in path("drafts.**"))][0]._id`,
  )
  if (!parent) {
    console.error('The "about-us" page is not published. Nothing was written.')
    process.exit(1)
  }

  const pageIds = new Map<string, string>()
  for (const {slug} of TARGETS) {
    const id = await client.fetch<string | null>(
      `*[_type == "page" && slug.current == $slug && parent._ref == $parent && !(_id in path("drafts.**"))][0]._id`,
      {slug, parent},
    )
    if (!id) {
      console.error(`The page about-us/${slug} is not published. Publish it first. Nothing was written.`)
      process.exit(1)
    }
    pageIds.set(slug, id)
  }

  const menus = await client.fetch<Array<{_id: string; items?: Group[]}>>(
    `*[_type == "menu" && title == "Footer Menu"]{_id, items}`,
  )
  const draft = menus.find((m) => m._id.startsWith('drafts.'))
  const menu = menus.find((m) => !m._id.startsWith('drafts.'))
  if (!menu) {
    console.error('There is no published "Footer Menu". Nothing was written.')
    process.exit(1)
  }
  if (draft) {
    console.error('The Footer Menu has unpublished edits. Publish or discard them first. Nothing was written.')
    process.exit(1)
  }

  let changes = 0
  const items = (menu.items ?? []).map((group) => {
    if (group.label !== 'About Us') return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const target = TARGETS.find((t) => t.label === child.label)
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (!target || !isPlaceholder) return child
        changes += 1
        console.log(`  ${DRY_RUN ? '[dry run] would link' : 'linking'} About Us > ${child.label} -> about-us/${target.slug}`)
        return {
          ...child,
          link: {
            _type: 'link',
            linkType: 'page',
            page: {_type: 'reference', _ref: pageIds.get(target.slug)},
          },
        }
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no Staff or FAQs placeholder links under About Us.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Run: `cd studio && npx tsc --noEmit && npx sanity exec scripts/linkArchivePagesInMenus.ts --with-user-token -- --dry`
Expected: type-check passes; with the pages unpublished, the dry run stops with "…is not published" and writes nothing (that is the correct, safe result); it exits non-zero, which is not a failure here.

- [ ] **Step 3: Record decisions**

Append `## 11. The staff, commissioner and FAQ archives` to `docs/DECISIONS.md` (the existing "Status / Why / Implication" format) covering: the archives are ordinary pages from blocks, so each address is changeable per archive (links by reference follow; old addresses need redirects, #9); the department tabs are derived from the staff data and the chosen department lives in `?department=`; the FAQ open-state panel; the seed and menu scripts and their guards; the Commissioners layout is the theme's, not Figma's (#15).

Post issue comments (retry with `gh api repos/temperandforge/NLB-nantucket-landbank-main/issues/<n>/comments -f body=…` if `gh issue comment` errors):

```bash
gh issue comment 11 --body "Archives: the Staff, Commissioners and FAQs pages are built from blocks (seed script creates them as drafts under about-us). Still here: importing the real staff, commissioners and FAQs from WordPress, and the news archive."
gh issue comment 15 --body "Also compare against Figma: the staff archive (node 1910:12263) including the department tabs and the 12px/64px grid gaps, and the FAQ archive (node 1637:6094) including the open state. The Commissioners page uses the theme's layout (its Figma nodes are not readable): please check it against the Design System."
gh issue comment 9 --body "The new about-us/staff, about-us/commissioners and about-us/faqs pages replace the WordPress /about/staff/, /about/commissioners/ and /faq/ addresses: they need redirects when the site goes live."
```

- [ ] **Step 4: Final verification**

Run the gate commands (separately) and `NODE_ENV=production npx next build`. Confirm no dev server is running. Ask the user for the say-so to run `seedArchivePages.ts` for real (and, after they publish the pages, `linkArchivePagesInMenus.ts`); run only on a yes. Commit:

```bash
git add -A docs studio frontend sanity.schema.json
git commit -m "feat: seed the staff, commissioners and FAQs pages and link them in the footer menu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** the three pages and their blocks (Task 4); People Grid filter, gaps, no-photo box (Tasks 1-2); FAQ description, 80px heading, columns, open panel (Task 3); footer links script with its guards (Task 4); decisions, issues and the Commissioners caveat (Task 4); deferred items stay deferred.
- **Names checked across tasks:** `departmentTabs`, `filterByDepartment`, `parseDepartment`, `departmentSearch` (Task 1) are used by `StaffFilter` (Task 2); `StaffGrid`/`StaffFilter` props; `--rich-text-size` (Task 3).
- **Instructions that are not code:** the `{/* … */}` line in Task 3 Step 4 (keep the existing markup).
- **Judgement calls an executor may hit:** `react-hooks` lint rules around `StaffFilter` (restructure, do not disable); a `Suspense`/`useSearchParams` build complaint; `about-us` missing (stop and tell the user); the menu script correctly refusing while the pages are drafts.
