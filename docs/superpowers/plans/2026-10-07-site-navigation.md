# Site Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `Nav.tsx` stub with a Sanity-driven site header (dropdowns, mobile drill-in panel, disabled search, dismissible banner) that hides on scroll down and reveals on scroll up.

**Architecture:** A `header` and a `siteBanner` singleton under Globals, plus an optional `group` field on `menuLink` for dropdown column headings. A server `Header` fetches both and composes small client components. All non-trivial logic (menu grouping, scroll hide/reveal, banner dismissal key) is a pure function with a plain `node scripts/verify*.mts` check, because the project has no test framework.

**Tech Stack:** Next.js (App Router, read `node_modules/next/dist/docs/` before touching routing/layout), Sanity Studio + GROQ + typegen, Tailwind v4 (`@theme` tokens in `frontend/css/`), TypeScript.

**Spec:** [docs/superpowers/specs/2026-10-07-site-navigation-design.md](../specs/2026-10-07-site-navigation-design.md)

## Global Constraints

- Only singletons get explicit `_id`s: `header` → `_id: 'header'`, `siteBanner` → `_id: 'siteBanner'`. Everything else lets Sanity generate ids.
- Menus are standalone `menu` documents, referenced. Never inline menu items onto a singleton.
- Menu nesting stays capped at two levels (`menuGroup` → `menuLink`). Dropdown column headings are `menuLink.group` strings, **not** a third level.
- Reuse the shared `link` object; do not add a parallel link shape.
- Constrain singleton queries by `_type` **and** `_id`.
- Page URLs come from `pagePath` in `frontend/sanity/lib/queries.ts` via the `link` fragment; never derive a URL from a slug alone, never re-inline `pagePath`.
- Anything rendered site-wide must degrade, never throw; guard each region independently.
- Tokens: use existing tokens first (`frontend/css/tokens.css`, `frontend/css/globals.css`); add new ones per-feature named after the Figma variable, and flag near-matches. Do not touch the Sanity-starter tokens.
- Icons are inline SVG components using `currentColor` in `frontend/components/icons/index.tsx`, each keeping its own geometry; never apply one size to unlike icons, never `size-full` inside a larger box. Large artwork is a committed file in `public/`. Never hotlink Figma asset URLs.
- Search ships **disabled**; deferred work gets a GitHub issue (`gh issue list --search` first), linked from the spec's deferred section and from the `TODO` in code.
- Seed scripts: run via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token`, idempotent, header states what it overwrites, `--dry` mode, read the plan before the real run.
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are tracked: run `npm run sanity:typegen` in `frontend` after any schema or query change and commit the result.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verification before claiming done: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`. Anything visual is verified in the browser, not by asking the user.

## Review Focus

Inputs and conditions the spec implies but no happy-path task exercises, most likely first:

1. `header` document missing, or `mainMenu` unpublished/unset → header renders the logo only and the page still renders (Task 8 check, `groupMenuLinks` of empty input in Task 2).
2. A menu link whose page reference is unpublished (link resolves to null) → the item is dropped, not rendered as a dead `<a>` (Task 5 `resolveItemHref` check).
3. `localStorage` throws or is blocked → banner still renders and dismisses for the session (Task 3 `safeStorage` check).
4. Scrolling while a dropdown/mobile panel is open, or with focus inside the header → header never hides (Task 3 `nextHeaderScroll` locked case).
5. Interleaved groups (A, B, A) and links with empty/whitespace `group` → three headings / headless list, never a crash or a merged column (Task 2).

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `studio/src/schemaTypes/objects/menuLink.ts` | modify | add optional `group` string |
| `studio/src/schemaTypes/singletons/header.ts` | create | `header` singleton (`mainMenu` reference) |
| `studio/src/schemaTypes/singletons/siteBanner.ts` | create | `siteBanner` singleton |
| `studio/src/schemaTypes/index.ts` | modify | register both |
| `studio/src/structure/index.ts` | modify | list under Globals, add to `DISABLED_TYPES`, fix header comment |
| `frontend/sanity/lib/queries.ts` | modify | project `group`; add `headerQuery`, `siteBannerQuery` |
| `frontend/sanity/lib/types.ts` | modify | header/banner types derived from query results |
| `frontend/sanity/lib/menuGroups.ts` | create | pure `groupMenuLinks` |
| `frontend/components/header/headerScroll.ts` | create | pure `nextHeaderScroll` |
| `frontend/components/header/bannerDismissal.ts` | create | pure `bannerKey`, guarded storage helpers |
| `frontend/scripts/verifyMenuGroups.mts` | create | checks `groupMenuLinks` |
| `frontend/scripts/verifyHeader.mts` | create | checks `nextHeaderScroll` + banner helpers |
| `frontend/components/icons/index.tsx` | modify | `SearchIcon`, `CloseIcon`, `MenuIcon` |
| `frontend/public/images/nlb-logo.svg` | create | committed logo artwork |
| `frontend/components/header/NavSearch.tsx` | create | disabled search field |
| `frontend/components/header/SiteBanner.tsx` | create | dismissible banner |
| `frontend/components/header/NavDropdown.tsx` | create | dropdown panel (grouped or flat) |
| `frontend/components/header/DesktopNav.tsx` | create | desktop bar, owns which dropdown is open |
| `frontend/components/header/MobileMenu.tsx` | create | hamburger, panel, drill-in |
| `frontend/components/header/HeaderShell.tsx` | create | sticky wrapper, hide/reveal |
| `frontend/components/header/Header.tsx` | create | server component composing everything |
| `frontend/app/layout.tsx` | modify | render `<Header />` |
| `frontend/components/Nav.tsx`, `frontend/components/Header.tsx` | delete | superseded stubs |
| `frontend/css/globals.css` | modify | `--header-height`, map height |
| `studio/scripts/seedHeaderContent.ts` | create | seed Header Menu + singletons |
| `docs/DECISIONS.md` | modify | new entry |
| `docs/superpowers/specs/2026-10-07-site-navigation-design.md` | modify | link the deferred issue |

---

### Task 1: Studio schema, structure and generated types

**Files:**
- Modify: `studio/src/schemaTypes/objects/menuLink.ts`
- Create: `studio/src/schemaTypes/singletons/header.ts`, `studio/src/schemaTypes/singletons/siteBanner.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/structure/index.ts`

**Interfaces:**
- Produces: document types `header` (`mainMenu?: reference→menu`) and `siteBanner` (`enabled?: boolean`, `message?: string`, `link?: link`); `menuLink.group?: string`. After typegen these appear in `frontend/sanity.types.ts` as `Header`, `SiteBanner`, and `MenuLink.group`.

- [ ] **Step 1: Add `group` to `menuLink`**

In `studio/src/schemaTypes/objects/menuLink.ts`, add this field after `link`, and update the header comment's last sentence to mention it:

```ts
    defineField({
      name: 'group',
      title: 'Column heading',
      type: 'string',
      description:
        'Optional. In a dropdown, consecutive links with the same heading appear together under it (e.g. "Purpose"). Leave empty for a plain list. Ignored in the footer.',
    }),
```

Replace the comment line `* nesting is deliberately capped at two levels (menuGroup -> menuLink); see menuGroup.ts.` by:

```ts
 * nesting is deliberately capped at two levels (menuGroup -> menuLink); see menuGroup.ts. The
 * header's dropdown column headings are the optional `group` string below, not a third level.
```

- [ ] **Step 2: Create the `header` singleton**

`studio/src/schemaTypes/singletons/header.ts`:

```ts
import {defineField, defineType} from 'sanity'
import {ChevronUpIcon} from '@sanity/icons'

/**
 * Header schema Singleton - the content of the site-wide header.
 *
 * Lives under Globals in the Studio structure and is edited as one fixed document with id
 * 'header'. The primary navigation is a standalone 'menu' document, referenced rather than
 * inlined (docs/DECISIONS.md 1.1). The logo is a committed asset, not a field.
 */

export const header = defineType({
  name: 'header',
  title: 'Header',
  type: 'document',
  icon: ChevronUpIcon,
  fields: [
    defineField({
      name: 'mainMenu',
      title: 'Main menu',
      type: 'reference',
      to: [{type: 'menu'}],
      description:
        'The primary navigation. A submenu becomes a dropdown; a plain link stays a link. Set a "Column heading" on links to split a dropdown into headed columns.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Header'}
    },
  },
})
```

- [ ] **Step 3: Create the `siteBanner` singleton**

`studio/src/schemaTypes/singletons/siteBanner.ts`:

```ts
import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'

/**
 * Site banner Singleton - the dismissible bar above the header.
 *
 * Edited as one fixed document with id 'siteBanner' under Globals. When 'enabled' is off nothing
 * renders. A visitor's dismissal is remembered against the message text, so editing the message
 * shows the banner again.
 */

export const siteBanner = defineType({
  name: 'siteBanner',
  title: 'Site banner',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show banner',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
      description: 'One line of plain text, e.g. "Welcome to the new website".',
      validation: (Rule) =>
        Rule.custom((message, context) => {
          const enabled = (context.document as {enabled?: boolean} | undefined)?.enabled
          return enabled && !message?.trim() ? 'Required while the banner is shown' : true
        }),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Optional. When set, the message becomes a link.',
    }),
  ],
  preview: {
    select: {enabled: 'enabled', message: 'message'},
    prepare({enabled, message}) {
      return {title: 'Site banner', subtitle: `${enabled ? 'Shown' : 'Hidden'}${message ? ` - ${message}` : ''}`}
    },
  },
})
```

- [ ] **Step 4: Register both types**

In `studio/src/schemaTypes/index.ts` add imports after the `footer` import:

```ts
import {header} from './singletons/header'
import {siteBanner} from './singletons/siteBanner'
```

and in `schemaTypes` add `header,` and `siteBanner,` directly after `footer,` under `// Singletons`.

- [ ] **Step 5: List them under Globals**

In `studio/src/structure/index.ts`:
- Add `'header',` and `'siteBanner',` to `DISABLED_TYPES` under `// Handled explicitly under Globals below.` (after `'footer',`).
- In the Globals `.items([...])`, add before the `Menus` item:

```ts
              S.listItem()
                .title('Header')
                .icon(FolderIcon)
                .child(S.document().schemaType('header').documentId('header')),
              S.listItem()
                .title('Site Banner')
                .icon(BellIcon)
                .child(S.document().schemaType('siteBanner').documentId('siteBanner')),
```

- Add `BellIcon` to the existing `@sanity/icons` import at the top of the file.
- In the file's header comment replace "The header menu will join it here without needing a schema change." with "The Header and Site Banner singletons sit beside it."

- [ ] **Step 6: Regenerate types and type-check**

Run: `cd frontend && npm run sanity:typegen && cd ../studio && npx tsc --noEmit`
Expected: typegen succeeds; `grep -n "SiteBanner\|group?: string" ../frontend/sanity.types.ts` shows the new types; `tsc` exits 0.

- [ ] **Step 7: Commit**

```bash
git add studio/src frontend/sanity.types.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat: add header and site banner singletons and a column heading on menu links

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Query projection, derived types and `groupMenuLinks`

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`, `frontend/sanity/lib/types.ts`
- Create: `frontend/sanity/lib/menuGroups.ts`, `frontend/scripts/verifyMenuGroups.mts`

**Interfaces:**
- Consumes: Task 1 schema.
- Produces:
  - `headerQuery`, `siteBannerQuery` (exported from `queries.ts`).
  - Types in `types.ts`: `HeaderData`, `HeaderMenuData`, `HeaderMenuItem`, `HeaderMenuLeaf`, `HeaderMenuGroup`, `HeaderMenuChild = HeaderMenuGroup['children'][number]`, `SiteBannerData`.
  - `groupMenuLinks<T extends {group?: string | null}>(links: readonly T[]): MenuLinkGroup<T>[]` and `type MenuLinkGroup<T> = {heading: string | null; links: T[]}`.

- [ ] **Step 1: Write the failing check**

`frontend/scripts/verifyMenuGroups.mts`:

```ts
/**
 * Verifies how a dropdown's links are grouped under column headings. No test framework, so a
 * plain script:
 *
 *   cd frontend && node scripts/verifyMenuGroups.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {groupMenuLinks} from '../sanity/lib/menuGroups.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const l = (label: string, group?: string | null) => ({label, group})
const shape = (links: ReturnType<typeof l>[]) =>
  groupMenuLinks(links)
    .map((g) => `${g.heading ?? '-'}:${g.links.map((x) => x.label).join('+')}`)
    .join('|')

check(shape([]) === '', 'no links gives no groups')
check(shape([l('A'), l('B')]) === '-:A+B', 'ungrouped links form one headless list')
check(
  shape([l('A', 'Purpose'), l('B', 'Purpose'), l('C', 'People')]) === 'Purpose:A+B|People:C',
  'consecutive links with one heading share a group',
)
check(
  shape([l('A', 'X'), l('B', 'Y'), l('C', 'X')]) === 'X:A|Y:B|X:C',
  'interleaved headings stay separate, in authored order',
)
check(shape([l('A', ''), l('B', '   '), l('C', null)]) === '-:A+B+C', 'empty and blank headings count as none')
check(shape([l('A', ' Purpose '), l('B', 'Purpose')]) === 'Purpose:A+B', 'headings are trimmed before comparing')
check(
  shape([l('A', 'Purpose'), l('B'), l('C', 'Purpose')]) === 'Purpose:A|-:B|Purpose:C',
  'an ungrouped link between two groups splits them',
)

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && node scripts/verifyMenuGroups.mts`
Expected: FAIL — `Cannot find module '../sanity/lib/menuGroups.ts'`.

- [ ] **Step 3: Implement the helper**

`frontend/sanity/lib/menuGroups.ts`:

```ts
/**
 * Splits a dropdown's links into headed columns.
 *
 * Consecutive links sharing a `group` string form one column under that heading; a link with no
 * (or a blank) group sits in a headless column. Order is the authored order, so interleaved
 * headings stay separate rather than being merged behind the editor's back. Dependency-free so
 * scripts/verifyMenuGroups.mts can import it directly.
 */

export type MenuLinkGroup<T> = {heading: string | null; links: T[]}

export function groupMenuLinks<T extends {group?: string | null}>(
  links: readonly T[],
): MenuLinkGroup<T>[] {
  const groups: MenuLinkGroup<T>[] = []
  for (const link of links) {
    const heading = link.group?.trim() || null
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) {
      last.links.push(link)
    } else {
      groups.push({heading, links: [link]})
    }
  }
  return groups
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd frontend && node scripts/verifyMenuGroups.mts`
Expected: seven `ok` lines, exit 0.

- [ ] **Step 5: Extend the GROQ projection and add the queries**

In `frontend/sanity/lib/queries.ts`, in `menuItemFields`'s `menuGroup` branch add `group,` after `label,`:

```ts
  _type == "menuGroup" => {
    children[]{
      _key,
      label,
      group,
      ${linkFields}
    }
  }
```

Directly after the existing `footerQuery` definition add:

```ts
/**
 * The site header. Matched on _type and the fixed singleton id, like footerQuery. The main menu
 * is null when the reference is unset or points at an unpublished menu - the header degrades.
 */
export const headerQuery = defineQuery(`
  *[_type == "header" && _id == "header"][0]{
    "mainMenu": mainMenu->{
      ${menuFields}
    }
  }
`)

/**
 * The site banner. Returns nothing unless it is switched on, so a disabled banner costs the
 * frontend no branch.
 */
export const siteBannerQuery = defineQuery(`
  *[_type == "siteBanner" && _id == "siteBanner" && enabled == true][0]{
    message,
    ${linkFields}
  }
`)
```

- [ ] **Step 6: Regenerate types and derive the prop types**

Run: `cd frontend && npm run sanity:typegen`
Expected: exits 0; `HeaderQueryResult` and `SiteBannerQueryResult` appear in `sanity.types.ts`.

In `frontend/sanity/lib/types.ts` change the import to
`import {FooterQueryResult, GetPageQueryResult, HeaderQueryResult, SiteBannerQueryResult} from '@/sanity.types'` and append:

```ts
/**
 * Header shapes, derived from the query result like the footer's. A top-level menuGroup is a
 * dropdown; a top-level menuLink is a plain link. A group's children carry the optional `group`
 * column heading that groupMenuLinks() turns into columns.
 */
export type HeaderData = NonNullable<HeaderQueryResult>
export type HeaderMenuData = NonNullable<HeaderData['mainMenu']>
export type HeaderMenuItem = HeaderMenuData['items'][number]
export type HeaderMenuLeaf = Extract<HeaderMenuItem, {_type: 'menuLink'}>
export type HeaderMenuGroup = Extract<HeaderMenuItem, {_type: 'menuGroup'}>
export type HeaderMenuChild = HeaderMenuGroup['children'][number]
export type SiteBannerData = NonNullable<SiteBannerQueryResult>
```

- [ ] **Step 7: Type-check and commit**

Run: `cd frontend && npm run type-check`
Expected: exits 0.

```bash
git add frontend/sanity frontend/sanity.types.ts studio/sanity.types.ts sanity.schema.json frontend/scripts/verifyMenuGroups.mts
git commit -m "feat: query the header and banner and group dropdown links under headings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scroll hide/reveal and banner dismissal helpers

**Files:**
- Create: `frontend/components/header/headerScroll.ts`, `frontend/components/header/bannerDismissal.ts`, `frontend/scripts/verifyHeader.mts`

**Interfaces:**
- Produces:
  - `type HeaderScrollState = {hidden: boolean; lastY: number}`
  - `nextHeaderScroll(prev: HeaderScrollState, input: {y: number; locked: boolean}, opts?: {topOffset?: number; delta?: number}): HeaderScrollState` — defaults `topOffset = 80`, `delta = 8`.
  - `bannerKey(message: string): string`
  - `readDismissed(key: string): boolean`, `writeDismissed(key: string): void` — both swallow storage errors.

- [ ] **Step 1: Write the failing check**

`frontend/scripts/verifyHeader.mts`:

```ts
/**
 * Verifies the header's scroll rules and the banner's dismissal key:
 *
 *   cd frontend && node scripts/verifyHeader.mts
 *
 * Imports the real helpers. Exits non-zero on the first failure.
 */
import {bannerKey, readDismissed, writeDismissed} from '../components/header/bannerDismissal.ts'
import {nextHeaderScroll, type HeaderScrollState} from '../components/header/headerScroll.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const at = (hidden: boolean, lastY: number): HeaderScrollState => ({hidden, lastY})
const free = (y: number) => ({y, locked: false})

check(nextHeaderScroll(at(false, 0), free(300)).hidden === true, 'scrolling down past the top hides it')
check(nextHeaderScroll(at(true, 300), free(250)).hidden === false, 'scrolling up reveals it')
check(nextHeaderScroll(at(true, 300), free(40)).hidden === false, 'near the top it is always shown')
check(nextHeaderScroll(at(true, 300), free(-30)).hidden === false, 'rubber-banding above the top shows it')
check(nextHeaderScroll(at(false, 300), free(304)).hidden === false, 'a small downward jitter does not hide it')
check(nextHeaderScroll(at(true, 300), free(296)).hidden === true, 'a small upward jitter does not reveal it')
check(nextHeaderScroll(at(false, 300), free(304)).lastY === 300, 'jitter keeps the anchor so drift accumulates')
check(nextHeaderScroll(at(false, 100), {y: 500, locked: true}).hidden === false, 'locked (menu open or focus inside) never hides')
check(nextHeaderScroll(at(true, 100), {y: 500, locked: true}).hidden === false, 'locked reveals a hidden header')
check(nextHeaderScroll(at(false, 0), free(300)).lastY === 300, 'a real move updates the anchor')

check(bannerKey('Welcome') === bannerKey('Welcome'), 'the same message gives the same key')
check(bannerKey('Welcome') === bannerKey('  Welcome  '), 'surrounding whitespace is ignored')
check(bannerKey('Welcome') !== bannerKey('Welcome back'), 'a changed message gives a new key')

// Storage that throws (private window, blocked site data) must not break the banner.
const blocked = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
}
Object.defineProperty(globalThis, 'localStorage', {value: blocked, configurable: true})
check(readDismissed('k') === false, 'a throwing localStorage reads as not dismissed')
let threw = false
try {
  writeDismissed('k')
} catch {
  threw = true
}
check(threw === false, 'a throwing localStorage does not throw on write')

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  },
  configurable: true,
})
check(readDismissed('k') === false, 'nothing stored reads as not dismissed')
writeDismissed('k')
check(readDismissed('k') === true, 'a stored dismissal reads back')

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && node scripts/verifyHeader.mts`
Expected: FAIL — `Cannot find module '../components/header/bannerDismissal.ts'`.

- [ ] **Step 3: Implement `headerScroll.ts`**

```ts
/**
 * The header's hide-on-scroll-down, reveal-on-scroll-up rule, as a pure function so
 * scripts/verifyHeader.mts can check it without a browser.
 *
 * - Within `topOffset` of the page top (or above it, while rubber-banding) it is always shown.
 * - While `locked` (a menu is open or focus is inside the header) it is always shown.
 * - A move smaller than `delta` is ignored and the anchor is NOT advanced, so slow drift still
 *   adds up to a decision instead of being swallowed a few pixels at a time.
 */

export type HeaderScrollState = {hidden: boolean; lastY: number}

type Options = {topOffset?: number; delta?: number}

export function nextHeaderScroll(
  prev: HeaderScrollState,
  input: {y: number; locked: boolean},
  {topOffset = 80, delta = 8}: Options = {},
): HeaderScrollState {
  const {y, locked} = input
  if (locked || y <= topOffset) return {hidden: false, lastY: y}
  if (Math.abs(y - prev.lastY) < delta) return prev
  return {hidden: y > prev.lastY, lastY: y}
}
```

- [ ] **Step 4: Implement `bannerDismissal.ts`**

```ts
/**
 * Banner dismissal. A visitor's dismissal is remembered against a hash of the message, so
 * editing the message in the Studio shows the banner again. localStorage can throw or be empty
 * (private windows, blocked site data), so every access is guarded and the banner simply shows
 * again when storage is unavailable.
 */

const PREFIX = 'nlb-banner-dismissed:'

/** djb2 - small, stable and good enough for telling two short messages apart. */
export function bannerKey(message: string): string {
  const text = message.trim()
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  }
  return PREFIX + (hash >>> 0).toString(36)
}

export function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Storage unavailable: the dismissal lasts until the component unmounts.
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd frontend && node scripts/verifyHeader.mts`
Expected: 17 `ok` lines, exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/header frontend/scripts/verifyHeader.mts
git commit -m "feat: add the header's scroll rule and the banner's dismissal key

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Design values, icons and the logo

**Files:**
- Modify: `frontend/components/icons/index.tsx`, `frontend/css/globals.css`
- Create: `frontend/public/images/nlb-logo.svg`

**Interfaces:**
- Produces: `SearchIcon`, `CloseIcon`, `MenuIcon` (each `({className}: {className?: string}) => JSX.Element`); CSS custom property `--header-height`; file `/images/nlb-logo.svg` with its natural width/height recorded in a comment in `Header.tsx` (Task 8).

- [ ] **Step 1: Read the exact Figma values**

Figma file `gvzEWIlCG5ER28tsFD6YlI`. `get_design_context` only works with a layer selected in the Figma desktop app; try these first and fall back as listed.

1. `get_metadata` on `61:2`, `615:497`, `633:67`, `704:164`, `59:4` — record bar height (desktop and mobile), banner height, dropdown paddings, column gaps, search field size.
2. `get_variable_defs` on the same nodes — record colour, type and spacing variable names.
3. If either errors with "nothing selected", ask the user to select the node in the Figma desktop app and retry; if they cannot, take measurements from `get_screenshot` at `maxDimension` ≥ 2400 and state in the commit message that values were measured from screenshots.

Write the results as a table in a scratch note (not committed). Map each Figma variable to an existing token:
`color/surface` cream → `bg-background` (`--color-background`, dusty-heath-1000) or `bg-surface-light`; yellow search button and hover arrow/underline → `--color-secondary` / `--color-border-alt` (goldenrod-500); text → `text-on-background`; muted text → `text-on-background-subtle`; field fill → `--color-input`; rules → `--color-border-light`; banner → `bg-lowlands-500` with `text-on-accent-secondary`; error → `--color-utility-500`; labels → `font-mono-tracked`.
Add a token to `frontend/css/tokens.css` **only** where no existing one is within a few percent of the Figma value, named after the Figma variable, and mention each near-match in the commit message.

- [ ] **Step 2: Export the logo**

Use `mcp__figma__download_assets` (or `get_design_context` once the logo layer is selected) to save the logo from node `61:2` to `frontend/public/images/nlb-logo.svg`. It is the full-colour landscape badge, not the black mark in the old `Nav.tsx`. If neither tool can export it, stop and ask the user to export the layer as SVG into that path — do not redraw or trace it.

Verify it is non-empty and note its intrinsic size:
Run: `head -c 300 frontend/public/images/nlb-logo.svg`
Expected: an `<svg ... width="..." height="..." viewBox="...">` root. Record `width`/`height`.

- [ ] **Step 3: Add the three icons**

Export `Icon / search`, `Icon / close` and `Icon / menu` from Figma the same way (SVG, each keeping its own viewBox) and append to `frontend/components/icons/index.tsx` in the existing style. Use the exported path data; the shapes below are the required structure, replace `d` with the exported geometry:

```tsx
/** Magnifier. Figma: Icon / search. Exported viewBox preserved. */
export function SearchIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="<exported search geometry>" fill="currentColor" />
    </svg>
  )
}

/** Close ×. Figma: Icon / close. */
export function CloseIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="<exported close geometry>" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Hamburger. Figma: Icon / menu. */
export function MenuIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="<exported menu geometry>" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
```

Check first whether `ChevronDownIcon`, `ChevronUpIcon`, `ArrowRightIcon` and `ArrowLeftIcon` already match the nav's glyphs (they exist in this file); reuse them if so, and add a nav-specific variant only if the geometry differs.

- [ ] **Step 4: Add `--header-height` and fix the map height**

In `frontend/css/globals.css`, inside the `@theme` block add (value = the measured desktop bar height in rem from Step 1, e.g. `5rem`):

```css
  --header-height: 5rem;
```

and change the existing rule to use it:

```css
#mapWrap {
  height: calc(100dvh - var(--header-height) - 2.5rem);
}
```

- [ ] **Step 5: Type-check and commit**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both exit 0.

```bash
git add frontend/components/icons frontend/css frontend/public/images/nlb-logo.svg
git commit -m "feat: add nav icons, logo and header height token

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Search field and banner components

**Files:**
- Create: `frontend/components/header/NavSearch.tsx`, `frontend/components/header/SiteBanner.tsx`

**Interfaces:**
- Consumes: `bannerKey`, `readDismissed`, `writeDismissed` (Task 3); `SiteBannerData` (Task 2); `ResolvedLink`; `SearchIcon`/`CloseIcon`/`ArrowRightIcon` (Task 4).
- Produces:
  - `NavSearch({className, variant}: {className?: string; variant?: 'desktop' | 'mobile'})` — desktop is the yellow square button; mobile is the labelled field with arrow. Always disabled.
  - `SiteBanner({banner}: {banner: SiteBannerData})`.
  - `resolveItemHref` is added in Task 6, not here.

- [ ] **Step 1: Write `NavSearch`**

```tsx
import {ArrowRightIcon, SearchIcon} from '@/components/icons'

/**
 * Site search - UI only. Search itself (a results page and the "No search results" state) is
 * deferred, so every control is disabled and nothing submits. See the spec's deferred section.
 *
 * TODO: wire to site search once it exists - see the GitHub issue linked from
 * docs/superpowers/specs/2026-10-07-site-navigation-design.md
 */

type Props = {
  className?: string
  variant?: 'desktop' | 'mobile'
}

/** Tracked uppercase label - Figma type style mono/tracked. */
const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

export default function NavSearch({className, variant = 'desktop'}: Props) {
  if (variant === 'desktop') {
    return (
      <button
        type="button"
        disabled
        aria-label="Search (coming soon)"
        className={`flex size-10 items-center justify-center bg-secondary text-on-secondary opacity-100 disabled:cursor-not-allowed ${className ?? ''}`}
      >
        <SearchIcon className="size-6" />
      </button>
    )
  }

  return (
    <form
      role="search"
      aria-disabled="true"
      onSubmit={(event) => event.preventDefault()}
      className={`flex flex-col gap-gap-mini bg-input p-gap-sm ${className ?? ''}`}
    >
      <label htmlFor="nav-search-mobile" className={LABEL_CLASS}>
        Search
      </label>
      <div className="flex items-center gap-gap-sm border-b border-border-light">
        <input
          id="nav-search-mobile"
          type="search"
          disabled
          placeholder="Search here..."
          className="min-w-0 grow bg-transparent py-gap-mini font-secondary text-body-base placeholder:text-on-input-placeholder disabled:cursor-not-allowed"
        />
        <button type="submit" disabled aria-label="Search (coming soon)" className="disabled:cursor-not-allowed">
          <ArrowRightIcon className="size-6" />
        </button>
      </div>
    </form>
  )
}
```

(Adjust sizes/paddings to the values recorded in Task 4 Step 1 — the numbers above are structural defaults.)

- [ ] **Step 2: Write `SiteBanner`**

```tsx
'use client'

import {useEffect, useState} from 'react'

import {CloseIcon} from '@/components/icons'
import ResolvedLink from '@/components/ResolvedLink'
import type {SiteBannerData} from '@/sanity/lib/types'

import {bannerKey, readDismissed, writeDismissed} from './bannerDismissal'

/**
 * The dismissible bar above the header. Server-rendered visible, then hidden after hydration
 * if this visitor already dismissed this exact message - which avoids a layout shift for
 * first-time visitors at the cost of a brief flash for returning ones.
 */
export default function SiteBanner({banner}: {banner: SiteBannerData}) {
  const message = banner.message?.trim()
  const key = message ? bannerKey(message) : null
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (key && readDismissed(key)) setDismissed(true)
  }, [key])

  if (!message || !key || dismissed) return null

  const text = <span className="font-secondary text-body-small">{message}</span>

  return (
    <div className="relative flex items-center justify-center bg-lowlands-500 px-gap-lg py-gap-sm text-on-accent-secondary">
      {banner.link ? (
        <ResolvedLink link={banner.link} className="underline-offset-4 hover:underline">
          {text}
        </ResolvedLink>
      ) : (
        text
      )}
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => {
          writeDismissed(key)
          setDismissed(true)
        }}
        className="absolute right-gap-md top-1/2 -translate-y-1/2"
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  )
}
```

If `ResolvedLink` renders only its children for an unresolvable link, the message still shows unlinked — that is the intended degradation.

- [ ] **Step 3: Type-check, lint, commit**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both exit 0.

```bash
git add frontend/components/header
git commit -m "feat: add the disabled nav search field and the dismissible banner

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Desktop nav and dropdowns

**Files:**
- Create: `frontend/components/header/NavDropdown.tsx`, `frontend/components/header/DesktopNav.tsx`, `frontend/components/header/resolveItemHref.ts`
- Modify: `frontend/scripts/verifyMenuGroups.mts` (add the href checks)

**Interfaces:**
- Consumes: `groupMenuLinks`, `HeaderMenuData`, `HeaderMenuChild`, `ChevronDownIcon`, `ChevronUpIcon`, `ArrowRightIcon`, `NavSearch`, `linkResolver`.
- Produces:
  - `resolveItemHref(link: DereferencedLink | undefined): string | null` (null = unresolvable → drop the item).
  - `NavDropdown({id, labelledBy, children: HeaderMenuChild[]})`.
  - `DesktopNav({menu}: {menu: HeaderMenuData})` — a client component; its root carries `data-header-lock` while a dropdown is open (read by `HeaderShell` in Task 8).

- [ ] **Step 1: Write the failing href checks**

Append to `frontend/scripts/verifyMenuGroups.mts` before `process.exit`:

```ts
import {resolveItemHref} from '../components/header/resolveItemHref.ts'

check(resolveItemHref({_type: 'link', linkType: 'href', href: '#'}) === '#', 'a # placeholder resolves to #')
check(
  resolveItemHref({_type: 'link', linkType: 'page', page: 'about-us/history'}) === '/about-us/history',
  'a page link resolves to its full path',
)
check(
  resolveItemHref({_type: 'link', linkType: 'page', page: null}) === null,
  'a link to an unpublished page resolves to null so the item is dropped',
)
check(resolveItemHref(undefined) === null, 'a missing link resolves to null')
```

(Move the new `import` line up with the other imports.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && node scripts/verifyMenuGroups.mts`
Expected: FAIL — `Cannot find module '../components/header/resolveItemHref.ts'`.

- [ ] **Step 3: Implement `resolveItemHref`**

The check imports it as a plain `.ts`, so it must not use the `@/` alias:

```ts
import {linkResolver} from '../../sanity/lib/utils.ts'
import type {DereferencedLink} from '../../sanity/lib/types.ts'

/**
 * The href for a menu item, or null when it cannot be resolved - a link to a page that has
 * since been unpublished. Callers drop null items rather than rendering a dead link.
 */
export function resolveItemHref(link: DereferencedLink | undefined): string | null {
  const href = linkResolver(link)
  return typeof href === 'string' && href ? href : null
}
```

If `utils.ts` pulls in `@/`-aliased or server-only imports that Node cannot load, copy the three-line resolution rule into this file instead of importing it, and note in a comment that it mirrors `linkResolver`. Re-run Step 2.
Expected after: eleven `ok` lines, exit 0.

- [ ] **Step 4: Write `NavDropdown`**

```tsx
import ResolvedLink from '@/components/ResolvedLink'
import {ArrowRightIcon} from '@/components/icons'
import {groupMenuLinks} from '@/sanity/lib/menuGroups'
import type {HeaderMenuChild} from '@/sanity/lib/types'

import {resolveItemHref} from './resolveItemHref'

/** Tracked uppercase label - Figma type style mono/tracked. */
const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

/**
 * The panel under a top-level item. Links with a column heading render as headed columns, each
 * with a left rule; a menu with no headings renders as one flat list. Items whose link cannot
 * be resolved are dropped.
 */
export default function NavDropdown({
  id,
  labelledBy,
  items,
}: {
  id: string
  labelledBy: string
  items: HeaderMenuChild[]
}) {
  const live = items.filter((item) => resolveItemHref(item.link))
  if (live.length === 0) return null
  const columns = groupMenuLinks(live)
  const grouped = columns.some((column) => column.heading)

  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      className={`absolute top-full z-40 bg-background px-gap-md py-gap-md shadow-layer ${
        grouped ? 'left-0 right-0' : 'left-0 min-w-56'
      }`}
    >
      <div className={grouped ? 'grid grid-cols-3 gap-x-gap-lg' : ''}>
        {columns.map((column, index) => (
          <div key={`${column.heading ?? 'none'}-${index}`} className="flex flex-col gap-gap-sm">
            {column.heading && <h3 className={LABEL_CLASS}>{column.heading}</h3>}
            <ul className={`flex flex-col gap-gap-sm ${column.heading ? 'border-l border-border-light pl-gap-md' : ''}`}>
              {column.links.map((item) => (
                <li key={item._key}>
                  <ResolvedLink
                    link={item.link}
                    className="group inline-flex items-center gap-gap-sm border-b border-transparent font-secondary text-body-small hover:border-border-alt hover:text-secondary"
                  >
                    {item.label}
                    <ArrowRightIcon className="size-4" />
                  </ResolvedLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `DesktopNav`**

```tsx
'use client'

import {useEffect, useId, useRef, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavDropdown from './NavDropdown'
import NavSearch from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

/**
 * The desktop bar. Owns which dropdown is open: one at a time, closed by Escape (focus returns
 * to its trigger), by a click outside, or by opening another. While one is open the root carries
 * data-header-lock so HeaderShell keeps the header visible.
 */
export default function DesktopNav({menu}: {menu: HeaderMenuData}) {
  const baseId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    if (!openKey) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenKey(null)
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${openKey}"]`)?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openKey])

  return (
    <div ref={rootRef} data-header-lock={openKey ? '' : undefined} className="flex items-center gap-gap-md max-lg:hidden">
      <nav aria-label="Primary">
        <ul className="flex items-center gap-gap-md">
          {menu.items.map((item) => {
            if (item._type === 'menuLink') {
              if (!resolveItemHref(item.link)) return null
              return (
                <li key={item._key}>
                  <ResolvedLink link={item.link} className="font-secondary text-body-small hover:underline">
                    {item.label}
                  </ResolvedLink>
                </li>
              )
            }

            const open = openKey === item._key
            const triggerId = `${baseId}-${item._key}-trigger`
            const panelId = `${baseId}-${item._key}-panel`
            const hasLinks = item.children.some((child) => resolveItemHref(child.link))
            if (!hasLinks) return null
            const grouped = item.children.some((child) => child.group?.trim())

            return (
              <li key={item._key} className={grouped ? 'static' : 'relative'}>
                <button
                  id={triggerId}
                  type="button"
                  data-nav-trigger={item._key}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : item._key)}
                  className={`inline-flex items-center gap-gap-mini font-secondary text-body-small ${
                    open ? 'border-b border-border-dark text-on-background' : 'text-on-background-subtle'
                  }`}
                >
                  {item.label}
                  {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                </button>
                {open && <NavDropdown id={panelId} labelledBy={triggerId} items={item.children} />}
              </li>
            )
          })}
        </ul>
      </nav>
      <NavSearch variant="desktop" />
    </div>
  )
}
```

Arrow-key movement inside an open dropdown: add an `onKeyDown` on the panel wrapper in `NavDropdown` that moves focus between its `a` elements on ArrowDown/ArrowUp (query `a[href]` inside the panel, wrap at the ends, `preventDefault`). Keep it under 15 lines.

The grouped panel is positioned `left-0 right-0` relative to the nearest positioned ancestor — in Task 8 the bar container is `relative`, so it spans the bar; flat panels hang from their own `li`.

- [ ] **Step 6: Type-check, lint, commit**

Run: `cd frontend && node scripts/verifyMenuGroups.mts && npm run type-check && npm run lint`
Expected: all exit 0.

```bash
git add frontend/components/header frontend/scripts/verifyMenuGroups.mts
git commit -m "feat: add the desktop nav bar with grouped and flat dropdowns

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Mobile menu

**Files:**
- Create: `frontend/components/header/MobileMenu.tsx`

**Interfaces:**
- Consumes: `HeaderMenuData`, `groupMenuLinks`, `resolveItemHref`, `NavSearch`, `MenuIcon`, `CloseIcon`, `ChevronDownIcon`... (use the right-chevron the design shows; if the design-system chevron differs from `ChevronDownIcon`, add a `ChevronRightIcon` in Task 4's style), `ArrowLeftIcon`, `ResolvedLink`.
- Produces: `MobileMenu({menu}: {menu: HeaderMenuData})` — client component; root carries `data-header-lock` while open.

- [ ] **Step 1: Write `MobileMenu`**

```tsx
'use client'

import {useEffect, useId, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ArrowLeftIcon, ChevronDownIcon, CloseIcon, MenuIcon} from '@/components/icons'
import {groupMenuLinks} from '@/sanity/lib/menuGroups'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavSearch from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

/**
 * Hamburger plus a full-height panel under the bar. A top-level submenu drills into a
 * sub-panel with a Back link; plain links navigate directly. Body scroll is locked while open,
 * and closing the panel (toggle, Escape, or following a link) always resets the drill-in.
 */
export default function MobileMenu({menu}: {menu: HeaderMenuData}) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [drilledKey, setDrilledKey] = useState<string | null>(null)

  const close = () => {
    setOpen(false)
    setDrilledKey(null)
  }

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const drilled = menu.items.find((item) => item._key === drilledKey)

  return (
    <div data-header-lock={open ? '' : undefined} className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex size-10 items-center justify-center"
      >
        {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-40 flex h-[calc(100dvh-var(--header-height))] flex-col bg-background px-gap-md py-gap-md"
        >
          {drilled && drilled._type === 'menuGroup' ? (
            <div className="flex grow flex-col">
              <div className="flex grow flex-col gap-gap-md overflow-y-auto">
                <h2 className={LABEL_CLASS}>{drilled.label}</h2>
                {groupMenuLinks(drilled.children.filter((child) => resolveItemHref(child.link))).map(
                  (column, index) => (
                    <div key={`${column.heading ?? 'none'}-${index}`} className="flex flex-col gap-gap-sm">
                      {column.heading && <h3 className={LABEL_CLASS}>{column.heading}</h3>}
                      <ul className="flex flex-col gap-gap-sm">
                        {column.links.map((child) => (
                          <li key={child._key}>
                            <ResolvedLink link={child.link} className="font-secondary text-body-base">
                              <span onClick={close}>{child.label}</span>
                            </ResolvedLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => setDrilledKey(null)}
                className="mt-gap-md inline-flex items-center gap-gap-sm font-secondary text-body-small"
              >
                <ArrowLeftIcon className="size-5" />
                Back
              </button>
            </div>
          ) : (
            <div className="flex grow flex-col">
              <ul className="flex grow flex-col gap-gap-md overflow-y-auto">
                {menu.items.map((item) => {
                  if (item._type === 'menuLink') {
                    if (!resolveItemHref(item.link)) return null
                    return (
                      <li key={item._key}>
                        <ResolvedLink link={item.link} className="font-secondary text-body-base">
                          <span onClick={close}>{item.label}</span>
                        </ResolvedLink>
                      </li>
                    )
                  }
                  if (!item.children.some((child) => resolveItemHref(child.link))) return null
                  return (
                    <li key={item._key}>
                      <button
                        type="button"
                        onClick={() => setDrilledKey(item._key)}
                        className="inline-flex items-center gap-gap-sm font-secondary text-body-base"
                      >
                        {item.label}
                        <ChevronDownIcon className="size-4 -rotate-90" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <NavSearch variant="mobile" className="mt-gap-md" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

Nested `span onClick` inside the link lets a click on the link reset the panel state without overriding `ResolvedLink`'s navigation; if the project's `ResolvedLink` is later given an `onClick` prop, switch to that. `-rotate-90` turns the shared down-chevron into the design's right-chevron, so no new icon is needed.

- [ ] **Step 2: Type-check, lint, commit**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both exit 0.

```bash
git add frontend/components/header/MobileMenu.tsx
git commit -m "feat: add the mobile menu with a drill-in sub-panel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Header shell, server `Header` and layout integration

**Files:**
- Create: `frontend/components/header/HeaderShell.tsx`, `frontend/components/header/Header.tsx`
- Modify: `frontend/app/layout.tsx`
- Delete: `frontend/components/Nav.tsx`, `frontend/components/Header.tsx`

**Interfaces:**
- Consumes: `nextHeaderScroll` (Task 3), `DesktopNav`, `MobileMenu`, `SiteBanner`, `headerQuery`, `siteBannerQuery`, `sanityFetch`.
- Produces: `HeaderShell({children})` (client); default-export async `Header()` (server) used by the layout.

Before editing the layout read the layout docs: `ls node_modules/next/dist/docs/` and open the page on layouts and on client/server composition.

- [ ] **Step 1: Write `HeaderShell`**

```tsx
'use client'

import {useEffect, useRef, useState} from 'react'

import {nextHeaderScroll, type HeaderScrollState} from './headerScroll'

/**
 * Sticky wrapper that hides on scroll down and reveals on scroll up (rule in headerScroll.ts).
 *
 * "Locked" means a dropdown or the mobile panel is open (a descendant carries data-header-lock)
 * or keyboard focus is inside the header - in both cases the header must stay put. Anchor jumps
 * reveal it so focus is never left on a hidden element. One passive scroll listener, throttled
 * with requestAnimationFrame. The slide is removed under prefers-reduced-motion.
 */
export default function HeaderShell({children}: {children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef<HeaderScrollState>({hidden: false, lastY: 0})
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0

    const apply = (next: HeaderScrollState) => {
      state.current = next
      setHidden(next.hidden)
    }

    const locked = () => !!el.querySelector('[data-header-lock]') || el.contains(document.activeElement)

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        apply(nextHeaderScroll(state.current, {y: window.scrollY, locked: locked()}))
      })
    }
    const onReveal = () => apply({hidden: false, lastY: window.scrollY})

    window.addEventListener('scroll', onScroll, {passive: true})
    window.addEventListener('hashchange', onReveal)
    el.addEventListener('focusin', onReveal)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onReveal)
      el.removeEventListener('focusin', onReveal)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`sticky top-0 z-50 bg-background transition-transform duration-200 ease-out motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write the server `Header`**

Set `LOGO_WIDTH`/`LOGO_HEIGHT` from the natural size recorded in Task 4 Step 2.

```tsx
import Image from 'next/image'
import Link from 'next/link'

import {sanityFetch} from '@/sanity/lib/live'
import {headerQuery, siteBannerQuery} from '@/sanity/lib/queries'

import DesktopNav from './DesktopNav'
import HeaderShell from './HeaderShell'
import MobileMenu from './MobileMenu'
import SiteBanner from './SiteBanner'

const LOGO_WIDTH = 136 // natural width of public/images/nlb-logo.svg
const LOGO_HEIGHT = 40 // natural height

/**
 * Site header: the banner, then the sticky nav bar.
 *
 * Owns only composition. Every region is guarded independently - the header is on every page,
 * so a missing banner, a missing header document or an unpublished menu reference degrades to
 * rendering less (down to the logo alone), never to a thrown render. The banner scrolls away
 * with the page; only the bar is sticky.
 */
export default async function Header() {
  const [{data: header}, {data: banner}] = await Promise.all([
    sanityFetch({query: headerQuery}),
    sanityFetch({query: siteBannerQuery}),
  ])
  const menu = header?.mainMenu

  return (
    <>
      {banner?.message && <SiteBanner banner={banner} />}
      <HeaderShell>
        <div className="relative mx-auto flex h-(--header-height) max-w-site items-center justify-between px-gap-md">
          <Link href="/" aria-label="Nantucket Land Bank - home">
            <Image src="/images/nlb-logo.svg" alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority />
          </Link>
          {menu?.items?.length ? (
            <>
              <DesktopNav menu={menu} />
              <MobileMenu menu={menu} />
            </>
          ) : null}
        </div>
      </HeaderShell>
    </>
  )
}
```

- [ ] **Step 3: Render it from the layout and retire the stubs**

In `frontend/app/layout.tsx`: replace the commented `// import Header from '@/components/Header'` with `import Header from '@/components/header/Header'`, and replace the line `{/* <Header /> - pages render their own <Nav /> for now */}` with `<Header />`.

Then remove the stubs and any commented references:

```bash
git rm frontend/components/Nav.tsx frontend/components/Header.tsx
grep -rn "components/Nav'\|<Nav />\|components/Header'" frontend --include=*.tsx --exclude-dir=node_modules
```

For each hit (e.g. the commented `// import Nav` lines in `frontend/app/map/page.tsx`) delete the dead comment. Expected: no hits remain.

- [ ] **Step 4: Type-check and lint**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: render the sticky site header from the root layout

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Seed script

**Files:**
- Create: `studio/scripts/seedHeaderContent.ts`

**Interfaces:**
- Consumes: `buildPagePath` from `studio/src/lib/pageHierarchy.ts` (signature `(segments: (string | null | undefined)[]) => string`).
- Produces: a "Header Menu" `menu` document, the `header` singleton and a **disabled** `siteBanner` singleton.

- [ ] **Step 1: Write the script**

```ts
/**
 * Seeds the header menu from the Figma design, the `header` singleton, and a disabled `siteBanner`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedHeaderContent.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedHeaderContent.ts --with-user-token
 *
 * What it overwrites: nothing that already exists. The "Header Menu" is created only if absent;
 * pass --force to replace an existing Header Menu's items. The `header` and `siteBanner`
 * singletons are created only if absent (createIfNotExists), so Studio edits survive re-runs.
 *
 * Pages are never created. A link resolves to a real page reference only when a PUBLISHED page
 * with that path exists; otherwise it is a '#' placeholder and the script says so. The design's
 * typos ("Poperties", "Meting Agendas") are corrected here.
 */

import {getCliClient} from 'sanity/cli'

import {buildPagePath} from '../src/lib/pageHierarchy'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')
const MENU_TITLE = 'Header Menu'
const PLACEHOLDER_HREF = '#'

type Entry = {label: string; path?: string; group?: string}
type Top = {label: string; path?: string; children?: Entry[]}

/** Paths are the page's full URL path without the leading slash; omitted = placeholder. */
const MENU: Top[] = [
  {
    label: 'About Us',
    children: [
      {label: 'Conservation', group: 'Purpose', path: 'about-us/conservation'},
      {label: 'Recreation', group: 'Purpose', path: 'about-us/recreation'},
      {label: 'Agriculture', group: 'Purpose', path: 'about-us/agriculture'},
      {label: 'Commissioners', group: 'People'},
      {label: 'Staff', group: 'People', path: 'about-us/staff'},
      {label: 'History', group: 'Other', path: 'about-us/history'},
      {label: 'FAQs', group: 'Other', path: 'about-us/faqs'},
    ],
  },
  {
    label: 'Explore',
    children: [
      {label: 'Map', path: 'explore/interactive-map'},
      {label: 'Properties'},
      {label: 'Plan Your Visit', path: 'explore/plan-your-visit'},
      {label: 'Property Use Request', path: 'explore/request-for-property-use'},
      {label: 'ACK Trails'},
    ],
  },
  {
    label: 'Our Work',
    children: [{label: 'News'}, {label: 'Projects'}, {label: 'Events'}],
  },
  {
    label: 'Public Records',
    children: [
      {label: 'Meeting Minutes', path: 'public-records/meetings'},
      {label: 'Meeting Agendas', path: 'public-records/meetings'},
      {label: 'Annual Reports', path: 'public-records/annual-reports'},
      {label: 'Policies', path: 'public-records/policies'},
      {label: 'Establishment Documents', path: 'public-records/establishment-documents'},
    ],
  },
  {label: 'Transfer Documents', path: 'transfer-documents'},
  {label: 'Connect With Us', path: 'connect-with-us'},
]

function key(...parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type PageRow = {_id: string; slug?: string; parent?: string; grand?: string}

/** Published pages by full path, built with the same helper the Studio uses. */
async function publishedPagePaths(): Promise<Map<string, string>> {
  const rows = await client.fetch<PageRow[]>(
    `*[_type == "page" && !(_id in path("drafts.**")) && !coalesce(pathOnly, false)]{
      _id, "slug": slug.current, "parent": parent->slug.current, "grand": parent->parent->slug.current
    }`,
  )
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.slug) map.set(buildPagePath([row.grand, row.parent, row.slug]), row._id)
  }
  return map
}

function linkFor(path: string | undefined, pages: Map<string, string>, label: string) {
  const id = path ? pages.get(path) : undefined
  if (id) {
    console.log(`  page   ${label} -> /${path}`)
    return {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: id}}
  }
  console.log(`  #      ${label}${path ? ` (no published page at /${path})` : ''}`)
  return {_type: 'link', linkType: 'href', href: PLACEHOLDER_HREF}
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN - nothing will be written.\n' : '')
  const pages = await publishedPagePaths()
  console.log(`Found ${pages.size} published pages.\n`)

  const items = MENU.map((top) =>
    top.children
      ? {
          _type: 'menuGroup',
          _key: key(top.label),
          label: top.label,
          children: top.children.map((child) => ({
            _type: 'menuLink',
            _key: key(top.label, child.label),
            label: child.label,
            ...(child.group ? {group: child.group} : {}),
            link: linkFor(child.path, pages, `${top.label} / ${child.label}`),
          })),
        }
      : {
          _type: 'menuLink',
          _key: key(top.label),
          label: top.label,
          link: linkFor(top.path, pages, top.label),
        },
  )

  const existing = await client.fetch<{_id: string} | null>(
    `*[_type == "menu" && title == $title && !(_id in path("drafts.**"))][0]{_id}`,
    {title: MENU_TITLE},
  )

  if (DRY_RUN) {
    console.log(
      existing
        ? `\nWould ${FORCE ? 'REPLACE the items of' : 'keep'} the existing "${MENU_TITLE}" (${existing._id}).`
        : `\nWould create "${MENU_TITLE}".`,
    )
    console.log('Would create the header and siteBanner singletons if absent.')
    return
  }

  let menuId: string
  if (existing) {
    menuId = existing._id
    if (FORCE) {
      await client.patch(menuId).set({items}).commit()
      console.log(`\n= menu items replaced: ${MENU_TITLE} (${menuId})`)
    } else {
      console.log(`\n= menu exists, left alone: ${MENU_TITLE} (${menuId}) - use --force to replace`)
    }
  } else {
    const created = await client.create({_type: 'menu', title: MENU_TITLE, items})
    menuId = created._id
    console.log(`\n+ menu created: ${MENU_TITLE} (${menuId})`)
  }

  await client.createIfNotExists({
    _id: 'header',
    _type: 'header',
    mainMenu: {_type: 'reference', _ref: menuId},
  })
  await client.createIfNotExists({
    _id: 'siteBanner',
    _type: 'siteBanner',
    enabled: false,
    message: 'Welcome to the new website',
  })
  console.log('+ header and siteBanner singletons ensured (banner starts hidden)')
  console.log('\nDone. Publish the Header Menu and Header in the Studio to make them live.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Note the design lists both "Meeting Minutes" and "Meeting Agendas"; the footer seed has one `public-records/meetings` page, so both point at it. If a distinct agendas page exists, change the second path.

- [ ] **Step 2: Type-check**

Run: `cd studio && npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Dry run and read the plan**

Run: `cd studio && npx sanity exec scripts/seedHeaderContent.ts --with-user-token -- --dry`
Expected: a list of `page` / `#` lines for every item, then "Would create \"Header Menu\"." Read the list; confirm placeholders are only for pages that genuinely do not exist.

- [ ] **Step 4: Real run (only after the user agrees to write content)**

Run: `cd studio && npx sanity exec scripts/seedHeaderContent.ts --with-user-token`
Expected: `+ menu created: Header Menu (...)` and `+ header and siteBanner singletons ensured`. Re-run it: expected `= menu exists, left alone` — proving idempotency.

- [ ] **Step 5: Commit**

```bash
git add studio/scripts/seedHeaderContent.ts
git commit -m "feat: add the header content seed script

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Browser verification, deferred issue, decision record

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-07-site-navigation-design.md`, `frontend/components/header/NavSearch.tsx` (issue number in the TODO)

- [ ] **Step 1: Run the full checks**

Run, from the repo root:

```bash
cd frontend && node scripts/verifyMenuGroups.mts && node scripts/verifyHeader.mts && npm run sanity:typegen && npm run type-check && npm run lint
cd ../studio && npx tsc --noEmit
cd ../frontend && git status --short
```

Expected: every script exits 0; `git status` shows no uncommitted generated-file drift (if it does, commit it).

- [ ] **Step 2: Verify in the browser**

Start the dev server with `preview_start` (name from `.claude/launch.json`; add the entry if absent) — never via Bash. The header menu must exist in the dataset (Task 9 Step 4) and be published. Check with the preview tools, at desktop width then `resize_window` mobile (375×812), comparing against the Figma screenshots (`get_screenshot` on `61:2`, `633:67`, `704:164`, `59:4`):

1. Desktop bar: logo, six items, chevrons on the four dropdowns only, yellow search button disabled.
2. Open About Us: three headed columns (Purpose / People / Other) spanning the bar; Explore / Our Work / Public Records: flat lists under their item; open one, click another → the first closes; Escape closes and refocuses the trigger; outside click closes.
3. Scroll down 400px → header slides away; scroll up 20px → it returns; at the top it never hides; with a dropdown open it never hides; Tab into the header while hidden → it returns. Under `emulate_media` reduced motion the slide is instant.
4. Mobile: hamburger → panel with search pinned at the bottom; tap About Us → sub-panel with headings and Back; Back returns; close × resets the drill-in; body does not scroll behind the panel.
5. Banner: set `enabled: true` on the Site Banner in the Studio → bar shows above the header and scrolls away with the page; × hides it; reload keeps it hidden; change the message → it shows again; with `localStorage` blocked (`javascript_tool`: override `Storage.prototype.getItem` to throw) it still renders.
6. Degradation: unpublish the Header Menu (or point `mainMenu` at nothing) → page renders with the logo alone and no console errors; republish afterwards.
7. `/map`: the map fits below the header without a double scrollbar; note the behaviour with the banner on. If the map needs different treatment, make the smallest change and record it in Step 4.
8. A nested page (`/about-us/history`) renders under the same header.

Check `read_console_messages` is clean on each page. Take a screenshot per state as proof.

- [ ] **Step 3: File the deferred-work issue and link it**

```bash
gh issue list --search "site search" --state all
```

If no existing issue covers it:

```bash
gh issue create --title "Site search: results page, content search, and no-results state" --body "$(cat <<'EOF'
The header search field (desktop button and mobile field) ships disabled - see docs/superpowers/specs/2026-10-07-site-navigation-design.md.

Missing:
- A /search results page.
- A GROQ search over pages, news, projects and other content types (decide which types, and how to rank).
- Submitting the nav field to it, plus the field's active-typing and "No search results" states from the Figma Nav search component (node 704:164 in the Design System file).

Deferred because the design covers only the field, not the results experience, which is a separate feature.

Start at frontend/components/header/NavSearch.tsx (carries a TODO pointing here).
EOF
)"
```

Put the issue URL in the spec's "Deferred work" item 1 (replace "The issue is opened with the implementation and linked here" with the link) and in the `NavSearch` `TODO` comment.

- [ ] **Step 4: Record the decision**

Add a new entry to `docs/DECISIONS.md` in the Content model section, matching the existing entry format (decision, **Why:**, **Implication:**, **Status:** Implemented):

- *Dropdown column headings are a `group` string on `menuLink`, not a third menu level.* Why: the Figma About Us dropdown has Purpose / People / Other columns, but the two-level cap (1.2) exists so invalid half-states can't be authored and Sanity doesn't model recursive objects cleanly. Implication: headings are authored per link, consecutive links with one heading form a column, interleaved headings stay separate, the footer ignores `group`, and renaming a heading means editing each link under it.
- *The header and banner are Globals singletons; the header hides on scroll down.* Why/Implication: `header._id = 'header'`, `siteBanner._id = 'siteBanner'`; banner dismissal is keyed to the message; scroll rule lives in `headerScroll.ts` (checked by `verifyHeader.mts`); `--header-height` is the single source for anything sized against the bar (the map uses it).
- Under the deferred list at the foot of the file add the search issue number and, if Step 2 found one, any `/map` caveat.

- [ ] **Step 5: Final commit**

```bash
git add docs frontend/components/header/NavSearch.tsx
git commit -m "docs: record the navigation decisions and link the search issue

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Report to the user: what shipped, the issue number, any `/map` behaviour decided in Step 2, and that the real seed run wrote content only if they approved Task 9 Step 4.
