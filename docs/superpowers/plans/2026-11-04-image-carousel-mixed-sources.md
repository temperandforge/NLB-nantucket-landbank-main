# Image Carousel mixed entries and news source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Image Carousel block takes hand-picked uploaded images and related documents, projects in a category, or the latest news in a category, all rendered through the property gallery's card pipeline.

**Architecture:** Every source projects into the existing `GalleryEntry` shape, and one pure function (`carouselCards`) turns entries into cards. A shared `GalleryCarousel` component renders cards with the lightbox, and both the block and `PropertyGallery` use it. A `--dry`-capable script migrates existing blocks.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before touching route or component code), Sanity v3 Studio, GROQ, `sanity typegen`. No test framework: checks are plain `node scripts/*.mts` scripts.

**Spec:** [docs/superpowers/specs/2026-11-04-image-carousel-mixed-sources-design.md](../specs/2026-11-04-image-carousel-mixed-sources-design.md)

## Global Constraints

- Hand-picked members are exactly those of `property.gallery`: an uploaded `image` (fields `alt`, `caption`) and a `relatedDocument` reference to `article`, `project`, `property`, `event`. The member name `relatedDocument` must not change (Studio stores it as `_type`).
- `source` values: `manual` (default), `projectCategory`, `newsCategory`. The old value `category` is renamed `projectCategory`.
- `limit`: number, 1 to 20, default 8, labelled "Show latest", shown only for `newsCategory`. News order is `date desc`, then `_createdAt desc`.
- Required-field messages: "Choose a category" (project) and "Choose a news category".
- `defaultImage` applies to project cards only. News, events and properties with no image are dropped.
- No cards means the block renders nothing at all, not a lone eyebrow.
- Block preview subtitles: `Image Carousel · N entries`, `Image Carousel · <project category>`, `Image Carousel · News: <category>, latest <limit>`.
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are tracked: run `npm run sanity:typegen` in `frontend` after schema or query changes and commit the result.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Before finishing: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`. Stop any dev server you started.

## Review Focus

1. **A `newsCategory` block whose category is unset, deleted or unpublished** renders nothing and never throws (Task 3 query, Task 4 component).
2. **News where the newest articles have no image**: "latest 8" still shows 8 cards when more exist, because the limit applies after dropping (Task 1 test).
3. **A hand-picked project with no image shows `defaultImage`; a hand-picked event or news item with no image is dropped** (Task 1 test).
4. **A block with `source` unset, or `limit` unset in news mode**, behaves as `manual` with an empty gallery, or limit 8 (Task 1 and 4).
5. **Two carousel blocks on one page**: each owns its own lightbox list, so opening a picture in one never pages into the other's (Task 4, browser check).

---

### Task 1: The card builder, `carouselCards`

**Files:**
- Create: `frontend/sanity/lib/carouselCards.ts`
- Modify: `frontend/scripts/verifyGalleryCards.mts` (append a section)

**Interfaces:**
- Consumes: `galleryCards`, `GalleryEntry`, `GalleryCard`, `CardImage` from `./galleryCards.ts`.
- Produces: `carouselCards(entries: GalleryEntry[] | null | undefined, options?: {defaultImage?: CardImage | null; limit?: number | null}): GalleryCard[]` and exported `DEFAULT_NEWS_LIMIT = 8`.

- [ ] **Step 1: Write the failing checks** in `verifyGalleryCards.mts`, importing `carouselCards` from `../sanity/lib/carouselCards.ts`, using the existing `same`, `img`, `doc`, `related`, `upload`, `keys` helpers. Assertions, one `same(...)` each:
  - a `project` doc with `image: null` and `defaultImage: img('default')` becomes a card whose `image.asset._ref` is `'default'`;
  - an `event` doc with `image: null` and the same `defaultImage` is dropped (`keys` is `[]`);
  - an `article` doc with no image and a `defaultImage` is dropped;
  - ten `article` entries where the first three have no image, with `limit: 4`, give exactly the keys of the first four that have an image;
  - twelve imaged uploads with no `limit` give all 12 (the trim applies only when `limit` is passed), and twelve imaged articles with `limit: DEFAULT_NEWS_LIMIT` give 8;
  - `carouselCards(null)` and `carouselCards([])` are `[]`.

  The rule the tests pin: `limit` is applied only when the caller passes it (news mode passes `block.limit ?? DEFAULT_NEWS_LIMIT`); hand-picked and project modes pass none.

- [ ] **Step 2: Run** `cd frontend && node scripts/verifyGalleryCards.mts`. Expected: fails to import `carouselCards`.

- [ ] **Step 3: Implement `carouselCards`** in `carouselCards.ts`: for each entry whose `doc.docType === 'project'` and whose `doc.image` has no `asset._ref`, copy the entry with `doc.image = options.defaultImage` (when it has an asset); pass the list to `galleryCards`; if `options.limit` is a positive number, `slice(0, limit)`.

- [ ] **Step 4: Run** the script. Expected: every line `ok`, exit 0.

- [ ] **Step 5: Commit** `frontend/sanity/lib/carouselCards.ts` and the script: `feat(carousel): carouselCards applies the project default image and the news limit (#114)`.

---

### Task 2: Schema, shared gallery members

**Files:**
- Create: `studio/src/schemaTypes/objects/galleryEntries.ts`
- Modify: `studio/src/schemaTypes/objects/imageCarousel.ts`, `studio/src/schemaTypes/documents/property.ts` (the `gallery` field's `of`)

**Interfaces:**
- Produces: `galleryEntryMembers(options?: {excludeSelf?: boolean})` returning the array `of` for a gallery field (the image member and the `relatedDocument` member, moved verbatim from `property.ts`; the `_id != $self` filter is added only when `excludeSelf` is true).

- [ ] **Step 1: Implement `galleryEntryMembers`** by moving the two `defineArrayMember` definitions out of `property.ts` unchanged, and make `property.gallery` use `of: galleryEntryMembers({excludeSelf: true})`.

- [ ] **Step 2: Rewrite the `imageCarousel` fields** per the spec's schema table: `source` radio with titles "Hand-picked", "All projects in a category", "Latest news in a category"; `gallery` (`of: galleryEntryMembers()`, hidden unless `manual`, description repeating the property gallery's guidance that a document with no image is not shown); `category` (hidden unless `projectCategory`, validation "Choose a category"); `newsCategory` (reference to `newsCategory`, hidden unless `newsCategory`, validation "Choose a news category"); `limit` (number, `min(1).max(20).integer()`, `initialValue: 8`, hidden unless `newsCategory`). Remove `projects`. Update the file's doc comment and the `preview` to the three subtitles in Global Constraints (select `gallery`, `category.title`, `newsCategory.title`, `limit`).

- [ ] **Step 3: Verify** `cd studio && npx tsc --noEmit` passes. In `cd frontend && npm run sanity:typegen`, expect it to succeed; `type-check` is expected to fail in `ImageCarousel.tsx` (reads `block.projects`), fixed in Task 4.

- [ ] **Step 4: Commit** the schema files and regenerated `sanity.types.ts` / `sanity.schema.json`: `feat(carousel): block schema takes mixed entries, project or news category (#114)`.

---

### Task 3: Query, three sources into one entry shape

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (the `imageCarousel` branch near line 468, and the property query's `gallery[]{...}` near line 853)

**Interfaces:**
- Produces: two shared constants in `queries.ts`: `galleryDocFields` (the body of today's `doc` projection: `docType`, `title`, `slug`, `externalUrl`, and the `image` fallback chain) and `galleryEntryFields` (`_key, _type, asset, hotspot, crop, alt, caption, "doc": select(_type in ["relatedDocument","reference"] => @->{${galleryDocFields}})`). The block's result is `entries` in `GalleryEntry` shape plus `limit` and `defaultImage`.

- [ ] **Step 1: Extract the constants** and make the property query's `gallery[]{${galleryEntryFields}}` use them. Output must be identical to today's.

- [ ] **Step 2: Replace the block's `projects` projection** with `"entries": select(...)`:
  - `source == "newsCategory"`: `*[_type == "article" && defined(slug.current) && ^.newsCategory._ref in categories[]._ref] | order(date desc, _createdAt desc) [0...32] {"_key": _id, "_type": "reference", "doc": {${galleryDocFields}}}`. The 32 is the maximum `limit` (20) plus the 12 spare for imageless articles; keep it a comment next to the query.
  - `source == "projectCategory"`: the existing project filter (`^.category._ref in projectTypes[]._ref`), `order(name asc)`, same entry shape.
  - otherwise: `gallery[]{${galleryEntryFields}}`.
  Keep `"defaultImage"`; keep `...` so `source` and `limit` pass through.

- [ ] **Step 3: Run the query against the dataset** with `cd studio && npx sanity exec` (a throwaway script in the scratchpad that fetches a `page` containing an `imageCarousel`) or the Vision tool, once per source, and confirm each returns entries with `doc.title`, `doc.slug` and an `image` for documents that have one. Record the counts in the commit body. If no block uses `newsCategory` yet, test by substituting a real `newsCategory._id` in the fetched filter.

- [ ] **Step 4: Run** `cd frontend && npm run sanity:typegen`. Expected: succeeds; `block.entries` appears in `GetPageQueryResult`.

- [ ] **Step 5: Commit** `queries.ts` and the generated types (no structured-data builder changed, so `checkStructuredData.ts` is not needed): `feat(carousel): block query projects all three sources as gallery entries (#114)`.

---

### Task 4: One carousel component, used by the block and the property page

**Files:**
- Create: `frontend/components/blocks/GalleryCarousel.tsx`
- Modify: `frontend/components/blocks/ImageCarousel.tsx`, `frontend/components/PropertyView.tsx` (`PropertyGallery`)

**Interfaces:**
- Consumes: `GalleryCard` (Task 1's output type), `ImageLightboxProvider`, `ImageCarouselTrack`, `ImageCarouselSlide`.
- Produces: `GalleryCarousel({cards, label}: {cards: GalleryCard[]; label: string})` returning the `ImageLightboxProvider` + track + slides, exactly the JSX `PropertyGallery` renders today inside its section. It owns the `pictures` / `pictureIndex` computation that is currently inline in `PropertyGallery`.

- [ ] **Step 1: Move the lightbox-picture computation and slide mapping** from `PropertyGallery` into `GalleryCarousel`. `PropertyGallery` keeps its section, tag and early return, and renders `<GalleryCarousel cards={cards} label={label} />`. Behaviour of the property page must not change.

- [ ] **Step 2: Rewrite `ImageCarousel.tsx`:** `cards = carouselCards(block.entries, {defaultImage: block.defaultImage, limit: block.source === 'newsCategory' ? (block.limit ?? DEFAULT_NEWS_LIMIT) : undefined})`. If `cards.length === 0` return `null`. Otherwise the same section markup as today, with the eyebrow tag and `<GalleryCarousel cards={cards} label={block.eyebrow || 'Image carousel'} />`. Remove the `projectHref` import.

- [ ] **Step 3: Verify** `npm run type-check` and `npm run lint` pass in `frontend`.

- [ ] **Step 4: Browser check** (start the dev server on a free port, check first what is already running): the property page carousel and lightbox look and behave as before (compare against `main` if unsure). Stop the server after Task 6.

- [ ] **Step 5: Commit** `refactor(carousel): GalleryCarousel shared by the block and the property gallery; block uses carouselCards (#114)`.

---

### Task 5: Migration and seeds

**Files:**
- Create: `studio/scripts/migrateImageCarouselProjects.ts`
- Modify: `studio/scripts/seedAgriculturePage.ts` (the `imageCarousel` block near line 119), `studio/scripts/seedBlockGallery.ts` (near line 247)

**Interfaces:**
- Consumes: the `getCliClient` pattern and `--dry` flag handling of `studio/scripts/migrateArticleLinks.ts`.

- [ ] **Step 1: Write the script** with a header stating what it overwrites (only `source`, `gallery`, `projects` on `imageCarousel` blocks of `page` documents, drafts and published). Fetch pages with `pageBuilder[_type == "imageCarousel"]`; for each block that still has `projects` or `source == "category"`: set `gallery` to `projects` mapped to `{_key, _type: 'relatedDocument', _ref, _weak?}` entries (new `_key` from `randomUUID().slice(0, 12)`, same order, skipping any existing `_ref` already present), set `source` to `projectCategory` when it was `category`, unset `projects`. Patch by array key (`pageBuilder[_key=="..."]`), one transaction. Idempotent: a block with neither marker is skipped and reported as such. `--dry` prints one line per block and commits nothing.

- [ ] **Step 2: Run** `cd studio && npx sanity exec scripts/migrateImageCarouselProjects.ts --with-user-token -- --dry`. Read the plan: block counts and which would change. Expected: lists the blocks that hold `projects` and lists none as changed on a second dry run after Step 3.

- [ ] **Step 3: Run it for real**, then re-run `--dry`. Expected: second run reports every block as already migrated.

- [ ] **Step 4: Update the seeds:** `seedAgriculturePage.ts` uses `source: 'projectCategory'`; `seedBlockGallery.ts`'s stale block (it sets `images` with `carouselImage`, fields that no longer exist) becomes a `manual` block with a `gallery` of uploaded image entries built the way that script already builds image values.

- [ ] **Step 5: Commit** `feat(carousel): migrate block projects into the gallery array; update seeds (#114)`.

---

### Task 6: Verify in the browser, record the decision

**Files:**
- Modify: `docs/DECISIONS.md` (new section 28 after section 27, and the "Not done" line in 27), `docs/superpowers/specs/2026-11-04-image-carousel-mixed-sources-design.md` (status line)

- [ ] **Step 1: Create or edit three blocks** in Studio on a scratch page (or use the seeded ones): a mixed `manual` block (an uploaded image, a news item with an external URL, a project with no image), a `projectCategory` block, a `newsCategory` block with limit 3. In Chromium at desktop and phone width confirm: cards, order (news newest first), lightbox on the uploaded image only, the external news link opens in a new tab, `defaultImage` appears on the imageless project, a one-card block still looks right, and a `newsCategory` block with no category hides entirely.

- [ ] **Step 2: Write DECISIONS 28** (what changed, the `gallery` / three-source model, the migration, what was checked and what was not, e.g. touch, Safari) and mark 27's "Not done" line resolved. Set the spec's status to implemented.

- [ ] **Step 3: Run the full verification** from Global Constraints, stop the dev server, and commit `docs: record the image carousel's mixed sources (#114)`.

- [ ] **Step 4: Open the PR** that closes #114, then follow the PR workflow in the repository's tooling.
