# Image Carousel block: mixed entries and a news source (issue #114)

Status: **design, not implemented.** Closes [#114](../../../../issues/114). Builds on DECISIONS 26
(the carousel engine) and 27 (the property gallery's mixed entries).

## Intent

The Image Carousel page-builder block should offer what a property's gallery already does, and one
thing more. Success looks like:

- An editor can hand-pick uploaded images and related documents (news, projects, properties,
  events) for the block, the same as `property.gallery`.
- An editor can show the latest news from one category, newest first, capped at a number they set.
- The existing "all projects in a category" mode keeps working.
- Existing blocks keep working, through a migration, not a second code path.
- Cards, fallbacks and the lightbox are written once and shared with the property gallery.

## Starting point (verified in the code)

- `imageCarousel` (`studio/src/schemaTypes/objects/imageCarousel.ts`) has `source` (`manual` |
  `category`), `projects` (references to `project`) and `category` (reference to `projectType`).
- `ImageCarousel.tsx` renders projects directly, with `block.defaultImage` as the fallback for a
  project with no image. The GROQ branch is in `frontend/sanity/lib/queries.ts` (`imageCarousel`).
- `PropertyGallery` (`frontend/components/PropertyView.tsx`) uses `galleryCards()`,
  `ImageLightboxProvider`, `ImageCarouselTrack` and `ImageCarouselSlide`. Its entry projection and
  card-image fallback chain are in the property query.
- The member definitions of `property.gallery` are inlined in `property.ts`.
- `article` has `date` (required) and `categories` (references to `newsCategory`).
- `imageCarousel` blocks are created by `seedAgriculturePage.ts` and `seedBlockGallery.ts`, and may
  exist in the live dataset.

## Scope

In: the schema change, the three-source query, a shared card pipeline, the migration, the seeds,
verification, a DECISIONS entry.

Out: see Deferred.

## Design

### Schema (`imageCarousel`)

| Field | Type | Shown when | Notes |
| --- | --- | --- | --- |
| `eyebrow` | as today | always | |
| `source` | radio | always | `manual` (default), `projectCategory`, `newsCategory`. The old value `category` is renamed `projectCategory`. |
| `gallery` | array | `manual` | Same members as `property.gallery`: an uploaded `image` (alt, caption) or a `relatedDocument` reference to article, project, property or event. |
| `category` | reference to `projectType` | `projectCategory` | Required in that mode, as today. |
| `newsCategory` | reference to `newsCategory` | `newsCategory` | Required in that mode: "Choose a news category". |
| `limit` | number, 1 to 20, default 8 | `newsCategory` | Labelled "Show latest". |

`projects` is removed once the migration has run.

The `gallery` member definitions move to one shared helper that both `property.gallery` and
`imageCarousel.gallery` use, so they cannot drift. The member is named `relatedDocument`, as in
`property.gallery`: Studio stores that name as `_type`, so renaming it would orphan saved entries
(DECISIONS 27). `property.gallery` additionally excludes the property itself with a filter; the
helper takes that as an option, and the block does not use it.

The block preview reads `Image Carousel · N entries`, `· <project category>` or
`· News: <category>, latest <limit>`.

### Query

All three sources project into the existing `GalleryEntry` shape (`_key`, `_type`, image fields,
`doc`), so `galleryCards()` is the only place a card is decided.

- **manual:** the property gallery's projection, reused as one shared GROQ fragment.
- **projectCategory:** projects in the chosen category, `order(name asc)`, each emitted as an entry
  with the same `doc` projection.
- **newsCategory:** `_type == "article" && defined(slug.current) && ^.newsCategory._ref in
  categories[]._ref`, `order(date desc, _createdAt desc)`, fetching `limit` plus a margin of 12, each
  emitted as an entry with the same `doc` projection.

The card-image fallback chain (own image, SEO image, first body image) is the same fragment the
property query uses, kept in one constant per the project's rule on shared expressions.

The block's `defaultImage` stays in the projection. It applies to project cards only.

### Rendering

`ImageCarousel.tsx` calls `galleryCards()`, applies `defaultImage` to project cards that have none,
trims a news result to `limit` after cards are dropped (so "latest 8" is 8 visible cards), and wraps
the track in `ImageLightboxProvider`, as `PropertyGallery` does. The shared steps (map entries to
cards, trim, apply the fallback) live in one pure function so a script can check it.

- Uploaded images share one lightbox. Documents are links. News with an `externalUrl` opens in a new
  tab.
- A document with no image is dropped, except a project, which takes `defaultImage` (today's
  behaviour). News, events and properties with no image are dropped (DECISIONS 27).
- **No cards means no block.** `ImageCarousel` returns null rather than a lone eyebrow tag.
- A news category that was deleted or unpublished dereferences to nothing, so the list is empty and
  the block hides. It never throws.

### Migration

`studio/scripts/migrateImageCarouselProjects.ts`, run with `npx sanity exec ... --with-user-token`.

- For each page holding an `imageCarousel` block, convert `projects` references into `gallery`
  `relatedDocument` entries (same order), rename `source: category` to `projectCategory`, and unset
  `projects`.
- Idempotent: a block with no `projects` field is left alone. Matches on `_key`, so re-runs do
  nothing.
- `--dry` prints the plan and writes nothing. The header states what it overwrites: only the three
  fields above, on `imageCarousel` blocks, drafts and published alike.
- The seeds that create `imageCarousel` blocks are updated to the new fields.

### Verification

- `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in
  `studio`.
- Extend `frontend/scripts/verifyGalleryCards.mts` for the shared step and the news trim.
- Run the migration with `--dry`, read the plan, then run it.
- In the browser (Chromium, desktop and phone width): a mixed manual block, a project-category
  block, a news-category block with fewer articles than its limit, and one card alone; the lightbox
  from a hand-picked image; a news article with an external URL.
- Record the result in DECISIONS (a new entry after 27) and update `AGENTS.md` only if a rule
  changes (none is expected).

## Edge cases

- **Fewer cards than the limit, or one card:** the track tiles copies to fill the width. Checked in
  the browser, not assumed.
- **Articles with no `date`:** `date` is required, and `_createdAt` breaks ties.
- **Unpublished referenced documents:** dropped, as today.
- **Block already migrated:** the script does nothing.

## Deferred

- Multi-category news selection. One category now; widening it later needs no migration.
- A "see all news" link from the carousel.
- Mixed events or properties by category. Only projects and news have category modes.

None of these are in #114, so each needs its own issue only if the work is picked up; per the
project's rule, open them with `gh issue create` before finishing if any are left as stubs.
