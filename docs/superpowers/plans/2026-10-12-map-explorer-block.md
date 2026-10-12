# Map Explorer block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/map` route with a `mapExplorer` page-builder block that an editor places on the `explore/interactive-map` page.

**Architecture:** A new field-less `mapExplorer` block carries its data in its GROQ projection (properties, filter taxonomies, map settings), the same way `mapPreview` does. The map components move from `app/map/` to `components/map/`, and their types derive from the page-builder block types because the standalone queries are deleted. Filters write to the current pathname instead of `/map`. `app/map/` is deleted with no redirect.

**Tech Stack:** Next.js (App Router; read `node_modules/next/dist/docs/` before changing routes), Sanity v3 schema + GROQ + typegen, Mapbox GL, Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-10-12-map-explorer-block-design.md](../specs/2026-10-12-map-explorer-block-design.md)

## Global Constraints

- No test framework exists. "Verification" in each task is `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend` and `npx tsc --noEmit` in `studio`, plus browser checks in Task 6.
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are tracked: re-run typegen after any schema or query change and commit the result.
- Never restate taxonomy values in frontend code; derive types from generated query types.
- Use `#` for a link whose path is unknown; invent no URLs. A page URL is never derived from a slug alone.
- Content scripts: run via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token`, idempotent, state what they write in the header, `--dry` mode for anything that edits existing documents.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- `/map` returns 404 afterwards; there is no redirect. `/` with no landing page calls `notFound()`.
- Stop any dev server you start; check what is running first and do not kill one you did not start.

## Review Focus

1. **Filters on a nested path.** On `/explore/interactive-map`, toggling a filter must produce `/explore/interactive-map?propertyType=…`, not `/map?…` (Task 3 Step 5; Task 6).
2. **Existing filter params.** `?propertyType=` and `?resources=` keep their names and comma-separated format, so already-shared links still filter (Task 6).
3. **Empty or partial data.** A property with no boundary, an unpublished taxonomy (null entry) or zero properties must render without throwing; the block should show the map canvas and controls regardless (Task 6).
4. **`/` and `/map` behaviour.** `/map` → 404; `/` with no landing page → 404, not a redirect loop or a blank 200 (Task 4; Task 6).
5. **Two explorers on one page** share the same URL filters. Accepted, and noted in the block's Studio description rather than fixed.

---

### Task 1: Studio schema for the Map Explorer block

**Files:**
- Create: `studio/src/schemaTypes/objects/mapExplorer.ts`
- Modify: `studio/src/schemaTypes/index.ts` (import near line 25, registration near line 110)
- Modify: `studio/src/schemaTypes/documents/page.ts` (import near line 16, array near line 55)
- Modify: `studio/src/schemaTypes/objects/mapPreview.ts` (description)
- Modify: `studio/src/schemaTypes/objects/mapTeaser.ts:43` (`href: '/map'` → `'#'`)

**Interfaces:**
- Produces: block type `mapExplorer`, with no fields beyond those `defineBlock` adds. Tasks 2–3 rely on the `_type == "mapExplorer"` name.

- [ ] **Step 1: Create the block definition**

```ts
import {PinIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * The filterable interactive map: every property, boundary and trail from Project Settings, with
 * Property Type and Resources filters. It has no text of its own: put a Hero Tertiary above it for
 * the page heading and intro. Distinct from Map Preview, which is the lightweight embed with a
 * heading and no filters. Filters live in the URL, so two Map Explorers on one page share them.
 */
export const mapExplorer = defineBlock({
  name: 'mapExplorer',
  title: 'Map Explorer',
  type: 'object',
  icon: PinIcon,
  description:
    'The full filterable map of every property. Add a Hero Tertiary above it for the heading. Use Map Preview for a short embed without filters.',
  fields: [],
  preview: {
    prepare: () => ({title: 'Map Explorer', subtitle: 'Filterable map of every property'}),
  },
})
```

Before saving, open `blockFields.ts` and confirm `defineBlock` accepts `fields: []` and a `description`; if it requires at least one field or rejects `description`, follow what `mapPreview.ts` does and adjust.

- [ ] **Step 2: Register it**

In `studio/src/schemaTypes/index.ts` add `import {mapExplorer} from './objects/mapExplorer'` beside the `mapPreview` import and `mapExplorer,` beside `mapPreview,` in the types array. In `documents/page.ts` do the same: import beside `mapPreview` and add `mapExplorer,` to `pageBuilderBlocks` beside `mapPreview,`.

- [ ] **Step 3: Cross-reference from Map Preview, and fix the Map Teaser default link**

In `mapPreview.ts` add `description: 'A short embed of the map with a heading and no filters. Use Map Explorer for the full filterable map.',` to the `defineBlock` options. In `mapTeaser.ts` change `href: '/map'` to `href: '#'`.

- [ ] **Step 4: Verify**

Run (in `studio`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add studio/src
git commit -m "feat(studio): add Map Explorer block schema

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Query projection for the block

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (the `mapSettingsFields` / `mapFiltersQuery` section ~lines 126–180, and the page-builder projection near line 453)
- Regenerate: `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Consumes: block type `mapExplorer` from Task 1.
- Produces: on the `mapExplorer` page-builder member: `properties` (same shape as `mapPreview.properties`), `filters: {propertyTypes: {slug, title}[], resources: {slug, title}[]}`, `settings` (same shape as `mapPreview.settings`, without `eyebrow`/`heading`/`intro`). Task 3 derives its types from these.

The standalone `propertiesQuery`, `mapFiltersQuery` and `mapSettingsQuery` stay until Task 3 (they still type the old route); this task only adds.

- [ ] **Step 1: Add a shared filters fragment**

Directly after `mapPropertyFields`, add:

```ts
/**
 * Every available filter option, not just the ones in use: a category the client has created but
 * not yet assigned should still appear in the dropdown.
 */
const mapFiltersFields = /* groq */ `
  "propertyTypes": *[_type == "propertyType" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  },
  "resources": *[_type == "resource" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  }
`
```

Leave `mapFiltersQuery` as is for now (Task 3 deletes it).

- [ ] **Step 2: Drop the unused text fields from `mapSettingsFields`**

Nothing outside `app/map/page.tsx` reads the map settings' `eyebrow`, `heading` or `intro` (other `settings?.eyebrow` hits in `ProjectView.tsx` and `app/news/[slug]/page.tsx` come from different queries; confirm with `grep -rn "mapSettings" frontend --include=*.tsx --include=*.ts` that nothing else consumes them). Remove those three lines from `mapSettingsFields` so it starts at `"boundaryDataUrl"`.

- [ ] **Step 3: Add the block projection**

In the page-builder projection, directly after the `_type == "mapPreview"` branch, add:

```ts
    _type == "mapExplorer" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        ${mapPropertyFields}
      },
      "filters": {
        ${mapFiltersFields}
      },
      "settings": *[_type == "projectSettings" && _id == "projectSettings"][0]{
        ${mapSettingsFields}
      }
    },
```

- [ ] **Step 4: Typegen and check**

Run (in `frontend`): `npm run sanity:typegen && npm run type-check`
Expected: typegen succeeds; type-check fails in `app/map/page.tsx` because `settings.heading` / `intro` no longer exist on the shared fields. Keep the old route compiling until Task 3 deletes it by giving `mapSettingsQuery` the three text fields itself:

```ts
export const mapSettingsQuery = defineQuery(`
  *[_type == "projectSettings" && _id == "projectSettings"][0]{
    eyebrow,
    heading,
    intro,
    ${mapSettingsFields}
  }
`)
```

Re-run typegen and type-check; expected: pass. (This query is deleted in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat(frontend): query projection for the Map Explorer block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Move the map code and render the block; delete `/map`

**Files:**
- Move (`git mv`): `frontend/app/map/MapExplorer.tsx`, `MapboxMap.tsx`, `MultiSelectDropdown.tsx`, `boundaries.ts`, `types.ts` → `frontend/components/map/`
- Delete: `frontend/app/map/page.tsx` (and the then-empty `app/map/`)
- Create: `frontend/components/blocks/MapExplorer.tsx`
- Modify: `frontend/components/map/types.ts`, `frontend/components/map/MapExplorer.tsx`, `frontend/components/blocks/MapPreview.tsx:1`, `frontend/components/BlockRenderer.tsx`, `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Consumes: Task 2's generated block types.
- Produces: `components/map/types.ts` exporting `Property`, `MapFilters`, `MapSettings` (derived from block types), plus the unchanged helpers; `components/blocks/MapExplorer.tsx` default export `MapExplorerBlock`.

- [ ] **Step 1: Move the files**

```bash
cd frontend && mkdir -p components/map
git mv app/map/MapExplorer.tsx app/map/MapboxMap.tsx app/map/MultiSelectDropdown.tsx app/map/boundaries.ts app/map/types.ts components/map/
git rm app/map/page.tsx
```

The files import each other with `./`, so those imports stay valid. Update `components/blocks/MapPreview.tsx` line 1 to `import {MapboxMap} from '@/components/map/MapboxMap'`.

- [ ] **Step 2: Derive the types from the block types**

Replace the import and the three type aliases at the top of `components/map/types.ts`:

```ts
import type {ExtractPageBuilderType} from '@/sanity/lib/types'

type MapPreviewBlock = ExtractPageBuilderType<'mapPreview'>
type MapExplorerBlock = ExtractPageBuilderType<'mapExplorer'>

/**
 * Map types derived from the generated page-builder block types, so they cannot drift from the
 * GROQ projections. Map Preview and Map Explorer share the property and settings projections;
 * the filters exist only on Map Explorer.
 */
export type Property = NonNullable<MapPreviewBlock['properties']>[number]
export type MapFilters = NonNullable<MapExplorerBlock['filters']>
export type MapSettings = NonNullable<MapPreviewBlock['settings']>
```

Keep the rest of the existing doc comment's rationale (taxonomies are documents, not unions) in the file; only the import and aliases change.

- [ ] **Step 3: Make the filters follow the current path**

In `components/map/MapExplorer.tsx`: change the next/navigation import to `import {usePathname, useRouter, useSearchParams} from 'next/navigation'`, add `const pathname = usePathname()` beside `useRouter()`, and replace

```ts
router.replace(query ? `/map?${query}` : '/map', {scroll: false})
```

with

```ts
router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false})
```

- [ ] **Step 4: Create the block component**

`frontend/components/blocks/MapExplorer.tsx`:

```tsx
import {Suspense} from 'react'

import {MapExplorer} from '@/components/map/MapExplorer'

import {BlockProps} from './types'

/**
 * The Map Explorer block: the filterable map. The Suspense boundary is required because the
 * explorer reads its filters from useSearchParams.
 */
export default function MapExplorerBlock({block}: BlockProps<'mapExplorer'>) {
  return (
    <Suspense fallback={null}>
      <MapExplorer
        projects={block.properties ?? []}
        filters={block.filters}
        settings={block.settings ?? null}
      />
    </Suspense>
  )
}
```

In `components/BlockRenderer.tsx` import it (`import MapExplorerBlock from './blocks/MapExplorer'`, matching how the neighbouring imports are written) and add `mapExplorer: MapExplorerBlock,` after `mapPreview: MapPreview,`.

- [ ] **Step 5: Delete the unused standalone queries**

In `queries.ts` delete `propertiesQuery`, `mapFiltersQuery` and `mapSettingsQuery` (and the doc comments directly above each). Keep `mapPropertyFields`, `mapFiltersFields` and `mapSettingsFields`. Update the comments on `mapPropertyFields` / `mapSettingsFields` that say "shared by the map page" to "shared by the Map Preview and Map Explorer blocks".

- [ ] **Step 6: Typegen and check**

Run (in `frontend`): `npm run sanity:typegen && npm run type-check && npm run lint`
Expected: all pass. If `MapFilters`' type is nullable at a call site, check that the projection's `"filters": {…}` is not wrapped in `coalesce` or a conditional, and fix the type rather than adding `!`.

- [ ] **Step 7: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): render the filterable map as a block and remove /map

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Root fallback and route comment

**Files:**
- Modify: `frontend/app/page.tsx:33`
- Modify: `frontend/app/[...slug]/page.tsx:16-17`

- [ ] **Step 1: 404 when no landing page is set**

In `app/page.tsx`, replace `if (!page?._id) redirect('/map')` with `if (!page?._id) notFound()`. Fix the imports: add `notFound` to the `next/navigation` import and remove `redirect` if nothing else in the file uses it.

- [ ] **Step 2: Fix the stale route comment**

In `app/[...slug]/page.tsx` replace

```
 * More specific routes still win over this one: /map
 * matches app/map, both of which Next.js checks before a catch-all.
```

with

```
 * More specific routes still win over this one: /news matches app/news, which Next.js checks
 * before a catch-all.
```

- [ ] **Step 3: Verify**

Run (in `frontend`): `npm run type-check && npm run lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/app
git commit -m "fix: 404 at / when no landing page is set, instead of redirecting to /map

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Content scripts and docs

**Files:**
- Create: `studio/scripts/addMapExplorerToMapPage.ts`
- Modify: `studio/scripts/seedBlockGallery.ts` (every `href: '/map'` → `href: '#'`)
- Modify: `docs/DECISIONS.md`, `AGENTS.md`, `studio/src/schemaTypes/documents/property.ts` (comment)

- [ ] **Step 1: Replace the `/map` hrefs in the gallery seed**

Run: `sed -i '' "s#href: '/map'#href: '#'#g" studio/scripts/seedBlockGallery.ts` then `grep -n "'/map'" studio/scripts/seedBlockGallery.ts`
Expected: no matches.

- [ ] **Step 2: Write the add-block script**

`studio/scripts/addMapExplorerToMapPage.ts`:

```ts
/**
 * Adds a Map Explorer block to the end of the Interactive Map page (explore/interactive-map).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/addMapExplorerToMapPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/addMapExplorerToMapPage.ts --with-user-token
 *
 * What it writes: one appended `mapExplorer` item on that page's pageBuilder, to the draft if the
 * page has one, otherwise to the published document. It never removes, reorders or edits existing
 * blocks. Idempotent: does nothing if either version already has a Map Explorer. It does not add a
 * heading: if the page has no Hero Tertiary it says so, because that copy is the client's.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)

type PageRow = {_id: string; types: string[] | null}

async function main() {
  const rows = await client.fetch<PageRow[]>(
    `*[_type == "page" && slug.current == "interactive-map" && parent->slug.current == "explore"]{
       _id,
       "types": pageBuilder[]._type
     }`,
  )
  if (rows.length === 0) {
    console.error('There is no explore/interactive-map page. Nothing was written.')
    process.exit(1)
  }

  if (rows.some((row) => row.types?.includes('mapExplorer'))) {
    console.log('  = explore/interactive-map already has a Map Explorer block')
    return
  }

  const target = rows.find((row) => row._id.startsWith('drafts.')) ?? rows[0]
  if (!rows.some((row) => row.types?.includes('heroTertiary'))) {
    console.warn('  ! the page has no Hero Tertiary: add one in the Studio for the heading and intro')
  }

  if (DRY_RUN) {
    console.log(`[dry run] would append a mapExplorer block to ${target._id}`)
    return
  }
  await client
    .patch(target._id)
    .setIfMissing({pageBuilder: []})
    .append('pageBuilder', [{_type: 'mapExplorer', _key: key()}])
    .commit()
  console.log(`  + appended a Map Explorer block to ${target._id}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

`parent->slug.current` is a GROQ dereference, which is correct here (the preview-path caveat in AGENTS.md applies only to `defineLocations`).

- [ ] **Step 3: Update `DECISIONS.md`**

1. Section 1.7: change "`frontend/app/map/types.ts` derives its types from the generated query results" to "`frontend/components/map/types.ts` derives its types from the generated page-builder block types".
2. Section 1.8: change `(`/map?propertyType=beach`)` to "(`?propertyType=beach`, on the page that carries the Map Explorer block)".
3. Section 3.1: replace "More specific routes still win — `/map` matches `app/map` before the catch-all is considered." with "More specific routes still win — `/news` matches `app/news` before the catch-all is considered."
4. Known outstanding items: delete the bullet "`/map` and the seeded `explore/interactive-map` page overlap; one should redirect." Under "Content model reset", change "With none set, `/` redirects to `/map`." to "With none set, `/` returns 404."
5. Append a new section at the end of the file (after 19.2):

```markdown
## 20. The interactive map is a page-builder block, not a route

**Status:** Implemented

`/map` is removed. The filterable map is the `mapExplorer` block, placed on a normal page
(`explore/interactive-map`); the page's heading comes from a Hero Tertiary, so the block has no text
fields. Map Preview stays the lightweight embed (heading, body, no filters). The map code lives in
`frontend/components/map/`, and the block carries its data in its GROQ projection, so there are no
standalone map queries. Filters write to the current pathname.

**Why:** `/map` and the CMS page overlapped, and a route cannot be moved, reworded or given a hero
in Studio. A block can.

**Implication:** There is no redirect: old `/map` links 404. `/` with no landing page also 404s.
`projectSettings.heading`, `intro` and `eyebrow` no longer feed the map and can be removed
(tracked in a GitHub issue). Two Map Explorers on one page share their URL filters.
```

- [ ] **Step 4: Update `AGENTS.md` and the stale comment**

In `AGENTS.md` change "More specific routes (`app/map`) still win" to "More specific routes (`app/news`) still win". In `studio/src/schemaTypes/documents/property.ts` line 11, leave the history comment about `properties.ts` alone (it names a deleted file as history, not a live path); no change needed unless it reads as a live path.

- [ ] **Step 5: File the deferred-work issue**

Search first: `gh issue list --search "projectSettings heading intro eyebrow map" --state all`. If nothing matches:

```bash
gh issue create --title "Remove unused heading, intro and eyebrow from Project Settings" --body "The map page used these fields; /map is gone and the Map Explorer block takes its heading from a Hero Tertiary (DECISIONS 20). Nothing reads them now. Remove the fields from studio/src/schemaTypes/singletons/projectSettings.ts and check for existing values worth copying into the page's Hero Tertiary first. Deferred to keep the route removal small."
```

Note the issue number in the spec's out-of-scope bullet.

- [ ] **Step 6: Verify and commit**

Run (in `studio`): `npx tsc --noEmit`
Expected: pass.

```bash
git add studio/scripts docs AGENTS.md docs/superpowers/specs
git commit -m "docs, scripts: add-block script, remove /map references, DECISIONS 20

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Run the content script and verify in the browser

**Files:** none (verification only; fix anything found in the owning task's files)

- [ ] **Step 1: Run the add-block script**

Run (in `studio`):
`npx sanity exec scripts/addMapExplorerToMapPage.ts --with-user-token -- --dry`
Read the plan; expected: "would append a mapExplorer block to …" (or "already has"). If it says the page is missing, stop and ask the user: do not create the page. Then run it without `--dry`.

- [ ] **Step 2: Routing verification**

Run: `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token`
Expected: passes (no hierarchy change, but this block adds a route consumer).

- [ ] **Step 3: Start the dev server and check the page**

Check what is running first (`lsof -i :3000`); if the port is taken by something that is not yours, use another. Start the frontend dev server with `preview_start` or the project's launch config, then open `/explore/interactive-map`.
Expected: the Hero Tertiary (if present), the filter dropdowns and the map canvas render. Without `NEXT_PUBLIC_MAPBOX_TOKEN` the canvas is empty: that is not a data failure. Verify data separately: use the browser's `read_page` to confirm both dropdowns list options, and check the network/RSC payload or React props for non-empty `properties`.

- [ ] **Step 4: Filters**

Select a Property Type. Expected: the URL becomes `/explore/interactive-map?propertyType=<slug>` (not `/map`), and an active-filter chip appears. Clear it: the URL returns to the bare path. Load `/explore/interactive-map?propertyType=<slug>&resources=<slug>` directly; expected: both filters are applied.

- [ ] **Step 5: Removed routes**

Request `/map` and `/map?propertyType=beaches`. Expected: 404 for both. Request `/` and confirm it renders the landing page if one is set (if you can, temporarily check the no-landing-page case by reading `landingPageQuery`'s result rather than editing content; expected `notFound()`).

- [ ] **Step 6: Full checks, then stop the server**

Run (in `frontend`): `npm run sanity:typegen && npm run type-check && npm run lint`; (in `studio`): `npx tsc --noEmit`. Expected: all pass, and `git status` shows no uncommitted generated-file changes. Stop the dev server you started.

- [ ] **Step 7: Commit any fixes**

If Steps 3–6 required changes, commit them with a message naming the fix. Otherwise nothing to commit.
