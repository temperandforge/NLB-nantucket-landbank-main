# SEO fields and structured data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every public page editor-controllable SEO metadata and schema.org JSON-LD derived from existing document data.

**Architecture:** A shared Sanity `seo` object feeds one `buildMetadata()` helper used by every route's `generateMetadata`. Pure, typed builders in `structuredData.ts` turn already-fetched documents into JSON-LD, rendered by a `<JsonLd>` server component. One trusted origin (`settings.siteUrl`) makes every URL absolute; with none, JSON-LD is omitted.

**Tech Stack:** Next.js 16 (App Router), next-sanity 13, Sanity 5, GROQ + `sanity typegen`, TypeScript. No test framework exists: pure builders are checked by a `tsx`-run assertion script, live data by a `sanity exec` script.

**Spec:** [docs/superpowers/specs/2026-10-23-seo-and-structured-data-design.md](../specs/2026-10-23-seo-and-structured-data-design.md). Decisions: [DECISIONS.md](../../DECISIONS.md) section 24. Read `node_modules/next/dist/docs/01-app/02-guides/json-ld.md` and the `generate-metadata` doc before Tasks 2 and 4 (project rule: Next docs first; they live in the repo-root `node_modules`).

## Global Constraints

- `seo` fields: `title` (string, warn >60), `description` (text, warn >160), `image` (image, alt required when set), `noIndex` (boolean). All optional.
- Canonical is **derived, never an editable field**.
- JSON-LD is **derived at render**; a property is omitted rather than emitted empty; never invent a value or placeholder URL.
- No origin (`settings.siteUrl`, then `NEXT_PUBLIC_SITE_URL`) means **no JSON-LD**, and it never throws.
- Serialise JSON-LD with `<` replaced by `<`. Fetch the data used for metadata and JSON-LD with `stega: false`.
- `record.date` maps to `dateCreated`, never `datePublished`.
- Singleton `settings` has `_id` `siteSettings`; constrain queries by `_type` as well.
- Page paths come from the shared `pagePath` expression in `frontend/sanity/lib/queries.ts`; never build a page href from a slug.
- After any schema change run `npm run sanity:typegen` in `frontend` and commit the generated files. Derive prop types from generated query result types.
- Commit message trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Page with no `seo`, no description, no image** (most pages today): `buildMetadata` must still return a valid title and canonical, not `undefined` fields that Next renders as empty tags. Pinned in Task 2.
- **`siteUrl` missing or not https:** no JSON-LD and no crash; metadata falls back to the existing behaviour. Pinned in Tasks 2 and 3.
- **Event with no `end`, or an unpublished/missing `location`:** `endDate` and `location` omitted. Pinned in Task 3.
- **Property with no boundary or marker (no `location`):** no `geo`. Pinned in Task 3.
- **`pathOnly` ancestor in a breadcrumb:** crumb has a name but no `item`. Pinned in Task 3.
- **Record with no title, no date:** `name` falls back to the file name; `dateCreated` omitted. Pinned in Task 3.
- **`noIndex` page:** emits `robots: noindex` and is absent from the sitemap. Pinned in Task 2.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `studio/src/schemaTypes/objects/seo.ts` (new) | The `seo` object type |
| `studio/src/schemaTypes/singletons/settings.tsx` | Add `siteUrl`, `seo`, `organization`; later drop `ogImage.metadataBase` |
| `studio/src/schemaTypes/documents/{page,article,event,property,project}.ts` | Add `seo` field in a "SEO" group |
| `studio/src/schemaTypes/index.ts` | Register `seo` |
| `frontend/sanity/lib/siteUrl.ts` (new) | `getSiteUrl()`, `absoluteUrl()` |
| `frontend/sanity/lib/seo.ts` (new) | `buildMetadata()` |
| `frontend/sanity/lib/structuredData.ts` (new) | One pure builder per schema.org type |
| `frontend/components/JsonLd.tsx` (new) | Renders `<script type="application/ld+json">` |
| `frontend/sanity/lib/queries.ts` | Project `seo`, `noIndex`, org fields, record file metadata, breadcrumb chain |
| `frontend/app/**/page.tsx`, `layout.tsx`, `sitemap.ts` | Use the helpers |
| `frontend/scripts/checkStructuredData.ts` (new) | Pure-builder assertions on fixtures |
| `studio/scripts/migrateSeoDefaults.ts` (new) | One-off `ogImage` / `metadataBase` copy |
| `studio/scripts/verifyStructuredData.ts` (new) | Run real builders against live data |

---

### Task 1: Studio schema

**Files:**
- Create: `studio/src/schemaTypes/objects/seo.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `singletons/settings.tsx`, `documents/{page,article,event,property,project}.ts`
- Modify (generated): `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Produces: object type `seo` with fields `title`, `description`, `image`, `noIndex`. On `settings`: `siteUrl` (url, https, required in validation), `seo` (the object), `organization` (object: `legalName` string, `logo` image-with-alt, `email` string, `telephone` string, `address` object `{streetAddress, addressLocality, addressRegion, postalCode}`, `sameAs` array of url). On the five documents: optional `seo` in a "SEO" group.

- [ ] **Step 1: Define `seoField` object `seo` in `seo.ts`** using `defineType`, reusing `altTextField()` from `objects/blockFields.ts` for the image alt (required when an image is set, as `settings.ogImage` does). Length hints are `rule.max(60).warning()` / `max(160).warning()`, not errors.
- [ ] **Step 2: Register `seo` in `schemaTypes/index.ts`.**
- [ ] **Step 3: Add the `seo` field to `page`, `article`, `event`, `property`, `project`** in a "SEO" group (property already uses groups; for the others add a `groups` array with a `default: true` first group so existing fields stay together).
- [ ] **Step 4: Add `siteUrl`, `seo`, `organization` to `settings.tsx`.** `siteUrl` validation: `rule.required().uri({scheme: ['https']})`.
- [ ] **Step 5: Run `cd frontend && npm run sanity:typegen`, then `npx tsc --noEmit` in `studio`.** Expected: both pass; `sanity.types.ts` now contains `Seo`.
- [ ] **Step 6: Open Studio (`sanity dev`), confirm the SEO group appears on an article and Settings has the new fields; stop the dev server.**
- [ ] **Step 7: Commit** `feat(studio): seo object, site URL and organization settings`.

---

### Task 2: Site URL, metadata builder, sitemap, and wiring

**Files:**
- Create: `frontend/sanity/lib/siteUrl.ts`, `frontend/sanity/lib/seo.ts`
- Modify: `frontend/sanity/lib/queries.ts`, `frontend/app/layout.tsx`, `app/page.tsx`, `app/[...slug]/page.tsx`, `app/news/[slug]/page.tsx`, `app/events/[slug]/page.tsx`, `app/properties/[slug]/page.tsx`, `app/projects/[slug]/page.tsx`, `app/search/page.tsx`, `app/sitemap.ts`

**Interfaces:**
- Produces (`siteUrl.ts`): `getSiteUrl(settings?: {siteUrl?: string | null} | null): string | null` (origin with no trailing slash, `null` unless an absolute https URL; falls back to `process.env.NEXT_PUBLIC_SITE_URL`) and `absoluteUrl(path: string, origin: string | null): string | null`.
- Produces (`seo.ts`): `buildMetadata(input: {seo?: SeoInput | null; title?: string | null; description?: string | null; image?: SanityImageSource | null; path: string; type?: 'website' | 'article'; settings?: SettingsSeo | null}): Metadata`, where `SeoInput` is the generated `seo` shape. Precedence per field: `seo` override, route-derived value, `settings.seo`, then `settings` (`title`, `description`, `ogImage`).
- Consumes: `resolveOpenGraphImage` from `sanity/lib/utils.ts`.

- [ ] **Step 1: Write `checkSeo.ts` assertions first** in `frontend/scripts/checkStructuredData.ts` (created here, extended in Task 3), run with `npx tsx scripts/checkStructuredData.ts`. Assert: `getSiteUrl({siteUrl: 'http://x.org'})` is `null`; `getSiteUrl({siteUrl: 'https://x.org/'})` is `'https://x.org'`; `buildMetadata({path: '/a', title: 'T'})` has `alternates.canonical === 'https://x.org/a'` with that origin and **no `description` key** when none is known; `seo.noIndex` gives `robots.index === false`; `seo.title` beats `title`.
- [ ] **Step 2: Run it, expect FAIL** (module not found).
- [ ] **Step 3: Implement `siteUrl.ts` and `seo.ts`.** `buildMetadata` always sets `alternates.canonical`, `openGraph` (`title`, `description`, `url`, `siteName`, `type`, `images`) and `twitter` (`summary_large_image`), omitting any key whose value is empty.
- [ ] **Step 4: Run it, expect PASS.**
- [ ] **Step 5: Extend queries** so each document query and `settingsQuery` projects `seo{title,description,image,noIndex}` (and the `sitemapData`/`*SitemapData` queries project `"noIndex": seo.noIndex`). Include `pageFields` so pages and the landing page carry `seo`.
- [ ] **Step 6: Replace each route's `generateMetadata` with a `buildMetadata` call.** Keep each route's existing title and description derivation; pass the route's path (page path from `pagePath`, `/news/<slug>`, `/events/<slug>`, etc.). In `layout.tsx` set `metadataBase` from `getSiteUrl(settings)` and keep the title template. `search` passes `seo: {noIndex: true}`. `/` and `[...slug]` now pass description and image.
- [ ] **Step 7: Switch `sitemap.ts` to `getSiteUrl`** (skip the sitemap if there is no origin rather than emit protocol-less URLs) and skip entries with `noIndex`.
- [ ] **Step 8: Run typegen, `npm run type-check`, `npm run lint` in `frontend`.** Expected: clean.
- [ ] **Step 9: Verify in the browser** (start the dev server on a free port; check what is already running first): view source on an article, an event, a nested page and `/search`. Expect a canonical, OG tags, and `noindex` on search; stop the server.
- [ ] **Step 10: Commit** `feat(seo): site URL, buildMetadata and sitemap`.

---

### Task 3: JSON-LD builders and component

**Files:**
- Create: `frontend/sanity/lib/structuredData.ts`, `frontend/components/JsonLd.tsx`
- Modify: `frontend/scripts/checkStructuredData.ts`

**Interfaces:**
- Produces (`structuredData.ts`), each returning a plain `Record<string, unknown>` or `null`:
  - `organizationLd(settings, origin)`, `websiteLd(settings, origin)`
  - `newsArticleLd(article, origin, publisher)` — `article: {title, slug, date, image, description}`
  - `eventLd(event, origin)` — `{title, slug, start, end, location, image, description}`
  - `placeLd(property, origin)` — `{name, slug, description, image, location}`
  - `projectLd(project, origin)` — `{name, slug, description, image, property?}`
  - `webPageLd({name, description, path}, origin)`
  - `breadcrumbLd(crumbs: {name: string; path: string | null}[], origin)`
  - `recordsArchiveLd(block: {records: RecordInput[]}, path, origin)` — `RecordInput: {title?, date?, fileUrl, fileName?, mimeType?, size?}`
- Produces (`JsonLd.tsx`): `JsonLd({data}: {data: (Record<string, unknown> | null | undefined)[] | Record<string, unknown> | null})` rendering one script per non-null graph, escaping `<` as `<`; renders nothing for null or empty.
- Consumes: `absoluteUrl` from `siteUrl.ts`; `resolveOpenGraphImage` (use its `url` for `image`).

- [ ] **Step 1: Add failing assertions to `checkStructuredData.ts`**, one per Review Focus item: event with no `end` has no `endDate`; event with `start` `2026-11-01T14:00:00.000Z` serialises with the New York offset; property without `location` has no `geo`; breadcrumb with a `null` path crumb has no `item`; record with no title or date has `name === fileName` and no `dateCreated`, and a record with `date` has `dateCreated` and **no** `datePublished`; every builder returns `null` for a `null` origin; `JsonLd` output contains `<` and no raw `<` inside the JSON for a name of `"</script>"`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement the builders and `JsonLd.tsx`.** Types per spec section 4; `Event` `location` is a `Place` with `name` only (the field is a plain string); time zone offset via `Intl.DateTimeFormat` with `America/New_York` (no new dependency); `eventAttendanceMode`/`eventStatus` are not emitted (no data).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: `npm run type-check` and `npm run lint`.** Expected: clean.
- [ ] **Step 6: Commit** `feat(seo): JSON-LD builders and component`.

---

### Task 4: Render JSON-LD on every route

**Files:**
- Modify: `frontend/sanity/lib/queries.ts`, `frontend/app/layout.tsx`, `app/page.tsx`, `app/[...slug]/page.tsx`, `app/news/[slug]/page.tsx`, `app/events/[slug]/page.tsx`, `app/properties/[slug]/page.tsx`, `app/projects/[slug]/page.tsx`, `frontend/components/blocks/RecordsArchive.tsx` (or the page that renders it)

**Interfaces:**
- Consumes: every builder from Task 3, `getSiteUrl`.
- Produces: queries projecting `organization{…}` on `settingsQuery`; on `pageFields` an `ancestors[]` of `{name, "path": <pagePath of ancestor>, pathOnly}` built **by extending the existing `pagePath` depth (max 3), not a new recursion** (see AGENTS.md: depth lives in two places; this reuses the same shared expression); on the `recordsArchive` branch `"mimeType": file.asset->mimeType, "size": file.asset->size`.

- [ ] **Step 1: Extend the queries** as above, then run `npm run sanity:typegen`.
- [ ] **Step 2: Render `organizationLd` + `websiteLd` in `layout.tsx`** (one fetch of `settings` already exists there; pass `stega: false`).
- [ ] **Step 3: Render the per-route graph** in each page component: `NewsArticle`, `Event`, `Place`, `WebPage`, plus `breadcrumbLd` for nested pages built from `ancestors` and the page itself, and `recordsArchiveLd` when a page's blocks contain a `recordsArchive`.
- [ ] **Step 4: `npm run type-check`, `npm run lint`.** Expected: clean.
- [ ] **Step 5: Verify in the browser** for each type: view source, copy the `application/ld+json` blocks, confirm they parse as JSON and all URLs are absolute (with `siteUrl` set in Studio, and again with it cleared to confirm no JSON-LD and no error). Stop the dev server.
- [ ] **Step 6: Commit** `feat(seo): render structured data on every route`.

---

### Task 5: Migration of site defaults

**Files:**
- Create: `studio/scripts/migrateSeoDefaults.ts`

**Interfaces:**
- Consumes: `settings` document `siteSettings`.
- Produces: copies `ogImage` → `seo.image` and `ogImage.metadataBase` → `siteUrl`, **only into fields that are empty**. Header states exactly this; supports `--dry`.

- [ ] **Step 1: Write the script**, run via `sanity exec` with `--with-user-token`, idempotent (a second run is a no-op).
- [ ] **Step 2: Run with `--dry`; read the plan; run for real.**
- [ ] **Step 3: Remove `metadataBase` from `settings.ogImage` in the schema** (data left in place, unused), re-run typegen, `tsc --noEmit` in `studio`.
- [ ] **Step 4: Commit** `feat(studio): migrate site SEO defaults`.

---

### Task 6: Live verification, docs and deferred issues

**Files:**
- Create: `studio/scripts/verifyStructuredData.ts`
- Modify: `docs/superpowers/specs/2026-10-23-seo-and-structured-data-design.md` (status), `docs/DECISIONS.md` section 24, `AGENTS.md` (project rules)

- [ ] **Step 1: Write `verifyStructuredData.ts`** in the style of `verifyPageRouting.ts`: for one published document of each covered type, import the real builders and queries, run them, and fail on a missing required property or any non-absolute URL.
- [ ] **Step 2: Run it** with `--with-user-token`; expect all checks to pass.
- [ ] **Step 3: Run the full verification set:** `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`.
- [ ] **Step 4: Validate in Google's Rich Results Test and the Schema.org validator** against a deployed preview URL for an article, an event, a property, and the records page. Record results in the spec.
- [ ] **Step 5: File a GitHub issue for each deferred item** in the spec (hreflang, hand-authored JSON-LD, Studio SEO preview, Search Console, `FAQPage`, `JobPosting`, `GovernmentOrganization`), after `gh issue list --search` for duplicates; link each in the spec's Deferred section. Close or reference #41.
- [ ] **Step 6: Update docs:** spec status to implemented, DECISIONS section 24 status, and one AGENTS.md rule block ("Structured data is derived; one origin; `seo` object") pointing at DECISIONS 24.
- [ ] **Step 7: Commit** `docs(seo): verification, deferred issues and project rules`.

---

## Self-review

- **Spec coverage:** site URL (T1, T2), `seo` object (T1), metadata builder (T2), sitemap fix (T2), JSON-LD table (T3, T4), records archive and query additions (T3, T4), Organization on settings (T1, T4), migration (T5), verification and deferred (T6), generated files (T1, T4).
- **Type consistency:** `getSiteUrl`/`absoluteUrl` defined in T2, consumed in T3, T4; builders defined in T3 are the ones named in T4.
- **Known risk:** breadcrumb ancestors in T4 must extend the existing `pagePath` depth and re-run `verifyPageRouting.ts` if that expression changes (AGENTS.md rule).
