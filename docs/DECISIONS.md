# Decision Record

Durable decisions about how this project is built, and why. Add to this file when a choice
constrains future work; don't record routine implementation detail.

Each entry states the decision, the reasoning, and what it obliges you to do. **Status** is
either `Implemented` or `Decided — not yet implemented`. Treat the second kind as a plan, not a
description of the code.

Related: [specs/](superpowers/specs/) holds the full design docs these decisions came from.

---

## 1. Content model

### 1.1 Menus are standalone, referenced documents

**Status:** Implemented

Navigation lives in `menu` documents that other documents reference, rather than as inline
arrays on the document that renders them.

**Why:** The footer menu and legal menu exist today; a header menu is coming. Referencing means
the header creates a `menu` document and points at it — no schema change and no duplicated item
schema.

**Implication:** When you need a new menu, create a `menu` document and add a reference field.
Never inline a menu's items onto a page or singleton.

### 1.2 `menuGroup` and `menuLink` are separate types

**Status:** Implemented

A menu item is either a `menuGroup` (a non-clickable heading with children) or a `menuLink` (a
label plus a link). Not one type with an optional link and optional children.

**Why:** One combined type permits states that mean nothing — an item with both a link and
children, or with neither. Two types make the invalid states unrepresentable, and the Studio
shows an explicit type picker.

**Implication:** Menu nesting is capped at two levels: a group's children are `menuLink`s and
cannot nest further. Sanity does not model recursive object types cleanly, and deeper nesting is
not a demonstrated need. Raise the cap only when something actually requires it.

### 1.3 `menuLink` reuses the shared `link` object

**Status:** Implemented

**Why:** URL / page reference and `openInNewTab` come for free, and link
authoring stays identical everywhere in the Studio.

**Implication:** Extending `link` extends every menu. Prefer changing `link` over adding a
parallel link shape.

### 1.4 Footer info columns are generic

**Status:** Implemented

`footer.infoColumns` is a repeatable `{heading, lines[]}`, not typed `phone` / `fax` / `address`
fields.

**Why:** The design bakes labels into the content ("Phone: 508-228-7240"), all three columns are
visually identical, and generic lets the client rename, reorder or add a column without a schema
change.

**Implication:** `infoLine.href` is optional so an email line can be a real `mailto:` and a
phone line a `tel:` while an address line stays plain text. Set it explicitly — do not
auto-detect link types from the text.

### 1.5 Derived values are computed at render, not stored

**Status:** Implemented

The footer copyright renders `Copyright © {current year} {organizationName}`. The year is not a
field.

**Why:** A stored year goes stale and nobody notices.

**Implication:** Prefer computing anything derivable over asking an editor to maintain it.

### 1.6 `socialLink` is a platform enum plus URL

**Status:** Implemented

**Why:** The organization can add or drop a network without a schema change.

**Implication:** Only `facebook`, `instagram` and `linkedin` ship with icons. `x` and `youtube`
are selectable but render nothing until an icon is exported from Figma into
`frontend/components/icons`. A platform with no icon is skipped, not rendered as an empty box.

### 1.7 Projects are the map's properties, and their categorisation is referenced

**Status:** Implemented

`project` is a Land Bank property — the parcels, beaches, trails and ponds on the interactive map.
It replaced the hardcoded array in `frontend/app/map/properties.ts`. Categorisation is by reference
to `propertyType` and `resource` documents.

**Why:** The taxonomies were TypeScript union types plus parallel label maps, so adding a category
meant a code change and a deploy. As documents, the client owns them.

**Implication:** The frontend must not restate the category list. Filter options come from the
documents, and `frontend/app/map/types.ts` derives its types from the generated query results.
A dereferenced taxonomy entry is null when its document is unpublished, so consumers filter those
out rather than rendering a blank option.

### 1.8 A taxonomy's slug is the stable key, its title is the label

**Status:** Implemented

Both `propertyType` and `resource` carry a slug and a title. The map's URL filters use the slug
(`/map?propertyType=beach`).

**Why:** Filter state is shareable and bookmarkable. Keying off the title would break every shared
link the moment someone fixed a typo.

**Implication:** Renaming a title is safe; changing a slug breaks existing links. The active-filter
chips look their label up from the fetched options, so a slug left in a URL for a category that has
since been deleted still renders as itself instead of blank.

### 1.9 Boundary geometry lives in one file, not on the documents

**Status:** Implemented

The client maintains a single GeoJSON FeatureCollection covering every boundary, uploaded to
`projectSettings.boundaryData`. Each project stores only `boundaryId`, naming one feature in it.

**Why:** This is how the client works — one export from their GIS, not per-parcel geometry pasted
into a CMS field. It also means re-exporting updates every boundary at once.

**Implication:** Which feature property holds the identifier is **configurable**
(`boundaryIdProperty`), because the file's schema is the client's, not ours — hardcoding a guess
like `MAP_ID` would break on their first upload. Replacing the file does not re-point any project,
so assignments must be re-checked afterwards. A duplicate identifier resolves to the first match,
since choosing arbitrarily would make the map depend on file ordering.

### 1.10 Popup content is authored, and resource badges key off slugs

**Status:** Implemented

`project` carries `image`, `description` and `link` for the map popup. The popup's "Handicap
Accessible" and "Parking" badges are driven by resource **slugs**, named once in `RESOURCE_SLUG`
in `frontend/app/map/types.ts`.

**Why:** The popup design predates the move to Sanity and used a hardcoded `Property` type whose
resource values were underscored (`handicap_accessible`). The `resource` documents use hyphens
(`handicap-accessible`), so every badge would have silently stopped rendering.

**Implication:** Changing a resource's slug breaks its badge. Naming them in one constant means
that dependency is findable rather than buried in a string comparison. Popup values are interpolated
into `setHTML`, so all authored text is escaped first.

### 1.11 The boundary picker reads the real file

**Status:** Implemented

`boundaryId` uses a custom Studio input (`studio/src/components/BoundaryIdInput.tsx`) that loads the
uploaded file, offers the identifiers it actually contains, and flags a stored value that is not
among them.

**Why:** A mistyped identifier produces a property that silently never draws on the map, with
nothing in the Studio to indicate why. Across hundreds of parcels that is the likeliest failure
mode in the whole feature.

**Implication:** The input degrades to an explanatory message and the raw stored value when no file
is uploaded, when it cannot be read, or when no feature carries the configured property — never a
blank control with no explanation.

---

## 2. Page hierarchy and URLs

> Shared definitions live in `studio/src/lib/pageHierarchy.ts` — the depth limit, the
> Presentation route filters, and the location projection. `studio/scripts/verifyPageRouting.ts`
> exercises those same filters against the dataset; run it after touching anything here.

### 2.1 Nesting is a `parent` self-reference on `page`

**Status:** Implemented

`page` gains `parent`, a reference to another `page`. No separate `section` document type.

**Why:** One type, the standard CMS hierarchy pattern, and a page can be nested under a real
content-bearing page as easily as under a grouping one.

**Implication:** An ancestor must be a **published** document. A draft-only ancestor resolves to
null in the published perspective, which silently breaks every descendant's URL.

### 2.2 `pathOnly` marks a page as a non-routable path segment

**Status:** Implemented

A boolean on `page`, default off. When on, the page contributes its slug to its descendants'
paths but returns 404 at its own URL.

**Why:** 2.1 requires ancestors to be published pages, but grouping segments like `about-us`
must not be publicly viewable. This reconciles the two.

**Implication:** When `pathOnly` is on, `heading` stops being required and the content fields
hide. Route handling must check it — a `pathOnly` page is never rendered.

### 2.3 URLs are derived from the parent chain, never authored

**Status:** Implemented

`slug` holds a **single segment** (`conservation`); slashes are rejected. The full path is
computed by walking ancestors.

**Why:** A hand-typed path duplicates information already in the hierarchy and drifts from it.

**Implication:** Renaming an ancestor's slug moves all descendant URLs automatically. Add
redirects if the old URLs were public.

### 2.4 The path is computed, not denormalized

**Status:** Implemented

A bounded GROQ `select` assembles the path at query time. No stored `fullPath` field.

```groq
select(
  defined(parent->parent) => parent->parent->slug.current + "/" + parent->slug.current + "/" + slug.current,
  defined(parent)         => parent->slug.current + "/" + slug.current,
  slug.current
)
```

**Why:** A denormalized field needs a sync mechanism and a cascade on every ancestor rename, and
it can drift. Computing cannot drift.

**Implication:** GROQ cannot recurse, so depth is fixed at the expression. This same expression
must be reused everywhere a page URL is needed — the page lookup, `generateStaticParams`, the
sitemap, and the `link` resolution fragment. Keep it in one shared constant; do not re-inline it.

### 2.5 Maximum depth is 3 segments

**Status:** Implemented

Up to two ancestors.

**Why:** Covers the current information architecture with one level of headroom. Every extra
level costs a branch in the path expression and another Presentation route.

**Implication:** Validation caps the ancestor chain at 2. Raising the limit means changing
`MAX_PAGE_DEPTH` and `PAGE_PRESENTATION_ROUTES` in `studio/src/lib/pageHierarchy.ts`, and the
`pagePath` expression in `frontend/sanity/lib/queries.ts` — the two live in different packages, so
they cannot share a constant. Then re-run `verifyPageRouting.ts`.

### 2.6 Slugs are unique per-sibling, and cycles are rejected

**Status:** Implemented

**Why:** Global slug uniqueness is wrong once paths are nested — two different parents may each
have a `history` child. A parent cycle would make path computation non-terminating.

**Implication:** Slug validation is async and scoped to the same parent. Parent validation
rejects self-reference and any ancestor cycle.

### 2.7 Unmatched paths return 404

**Status:** Implemented

The catch-all route calls `notFound()`. It previously returned 200 with the Sanity starter's
"This page has no content!" onboarding screen for *any* unmatched slug.

**Why:** A public visitor typing a wrong URL, or truncating one to `/about-us`, should get a
404. The onboarding screen is setup scaffolding, not a page state.

**Implication:** `PageOnboarding` is no longer used by the page route. A `pathOnly` page 404s
through the same path, because the page query excludes it rather than the route special-casing it.

---

## 3. Routing

### 3.1 Pages use a catch-all segment

**Status:** Implemented

`app/[...slug]/page.tsx`, not `app/[slug]`.

**Why:** Page paths span multiple segments while grouping ancestors have no page of their own, so
there is no real route hierarchy to build. One catch-all owns all page paths.

**Implication:** `params.slug` is `string[]`; type it `PageProps<'/[...slug]'>` and join with
`/` for the lookup. More specific routes still win — `/map` matches
`app/map` before the catch-all is considered. Adding a real static route above
the catch-all is safe.

### 3.2 `link.href` allows relative URLs

**Status:** Implemented

`Rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']})`.

**Why:** Most internal links are site-relative paths, and `#` is used as a placeholder until a
real path is known. The default `url` validation rejects anything without an origin, which fails
both.

**Implication:** `socialLink.url` carries the same allowance so `#` placeholders validate,
even though real values there are always absolute.

### 3.3 Presentation resolves both directions explicitly

**Status:** Implemented

`sanity.config.ts` declares one `mainDocuments` route per URL depth (URL → document) and
`defineLocations` per type (document → URL). Both draw on
`studio/src/lib/pageHierarchy.ts`.

**Why:** GROQ cannot recurse, so a single route pattern cannot match an arbitrary-depth path.
Presentation selects a route by parameter count, so one route per depth covers every page.

**Implication:** Each route is anchored with `!defined(...)` at the top of the parent chain, so
a shallow URL cannot resolve to a deeper document — without it, `/conservation` would also match
the page that lives at `/about-us/conservation`. Page routes must sit below more specific ones
like a future `/news/:slug`, which a two-segment page route would otherwise capture. A `pathOnly` page
reports no location rather than a broken link.

`defineLocations` `select` dereferences through document-preview paths (`parent.slug.current`),
which is what makes assembling the URL there possible. It is **not** GROQ: `parent->slug.current`
returns undefined, so a nested page was previewed at its leaf slug alone (`/conservation`, a 404).
`verifyPageRouting.ts` checks the GROQ equivalent of these fields; it cannot prove the preview store
follows the reference, so confirm that in Presentation after changing the select.

---

## 4. Design system and frontend

### 4.1 Tokens are added per-feature, named after their Figma variables

**Status:** Implemented

`frontend/css/globals.css` `@theme` holds only the tokens something actually consumes.
`color/brand/Lowlands` becomes `--color-brand-lowlands`.

**Why:** Importing the whole design system up front means committing values nothing has
validated against a real layout. Matching the Figma names keeps the two traceable.

**Implication:** Add tokens as features need them, following the existing naming. The
Sanity-starter tokens above them (`--color-brand: #f50`, the gray scale) are still used by other
pages — leave them until something replaces them.

### 4.2 Design tokens beat raw hex from a Figma export

**Status:** Implemented

The footer background uses the `brand/Lowlands` token `#3d5934`, though the Figma frame's fill is
a raw `#3e5936`.

**Why:** A one-shade difference between a token and a raw fill is a designer slip, not intent.

**Implication:** When an exported value is a near-miss for an existing token, use the token and
note the discrepancy. Flag it rather than silently encoding either value.

### 4.3 Brand fonts are additive

**Status:** Implemented

EB Garamond (`--font-primary`), DM Sans (`--font-secondary`) and DM Mono
(`--font-mono-tracked`) were added; Inter and IBM Plex Mono remain.

**Why:** Other pages still reference the starter fonts. Removing them is a separate migration.

### 4.4 Figma assets are committed, never hotlinked

**Status:** Implemented

**Why:** Figma asset URLs expire in about seven days.

**Implication:** Download and commit. Icons become inline React SVG components using
`currentColor`; large multi-path artwork stays a static file in `public/`.

### 4.5 Icon geometry is preserved per-asset

**Status:** Implemented

Each glyph keeps the size the design insets it at inside its shared box — the social icons sit in
29×29 boxes at 24.1667px (Facebook) and 21.75px (Instagram, LinkedIn).

**Why:** One global size stretches every asset whose inset differs.

**Implication:** Never apply a single size to unlike icons or size them with `size-full` inside a
larger box. Carry the per-asset size alongside the component.

### 4.6 Global chrome must degrade, never throw

**Status:** Implemented

The footer guards each band independently. A missing singleton, an unpublished menu reference, a
null-resolving link or an unknown social platform renders less, not an error.

**Why:** It renders on every page, so one content gap would break the whole site.

**Implication:** Anything rendered site-wide gets the same treatment. Schema `required()` rules
catch most gaps at authoring time, but references can always be unpublished.

### 4.7 Layout padding belongs to `<main>`, not `<body>`

**Status:** Implemented

**Why:** Body padding insets full-bleed regions like the footer from the viewport edges.

### 4.8 Unbuilt interactive features ship disabled

**Status:** Implemented

The newsletter form has no action and no handler, and both controls are `disabled`.

**Why:** An enabled form that silently does nothing reads as a bug. Disabled reads as
not-yet-available.

**Implication:** Record the missing work in the relevant spec's deferred section.

---

## 5. Sanity conventions

### 5.1 Only singletons get explicit document IDs

**Status:** Implemented

`footer` uses the fixed id `footer`. Ordinary documents let Sanity generate their `_id`.

**Why:** Sanity's own guidance. Slug-derived or legacy IDs encode meaning into an identifier that
should be opaque.

**Implication:** Wire relationships with `reference` fields and GROQ lookups, or with the `_id`
returned from a create call. Structure enforces singletons via
`S.document().documentId('...')`; there is no schema-level singleton option.

### 5.2 Seed and migration scripts run through `sanity exec`

**Status:** Implemented

`cd studio && npx sanity exec scripts/<name>.ts --with-user-token`

**Why:** It authenticates as the logged-in CLI user, so no write token needs to exist in the
environment or be handled by hand. It also lets a script create documents and then reference the
IDs Sanity returned, which honours 5.1 — a declarative NDJSON import cannot, because it needs
IDs up front.

**Implication:** Scripts must be idempotent — match existing documents on a natural key (slug,
title) and reuse them. Say plainly in the script header what it overwrites: the footer seed uses
`createOrReplace` and therefore discards Studio edits to the footer, while pages are never
overwritten.

### 5.3 Constrain singleton queries by `_type` as well as `_id`

**Status:** Implemented

`*[_type == "footer" && _id == "footer"][0]`, not `*[_id == "footer"][0]`.

**Why:** The id alone lets any document type satisfy the filter, so TypeGen widens the result to
a union including an all-null variant.

### 5.4 Types are generated, never hand-written

**Status:** Implemented

**Why:** `frontend/sanity.types.ts`, `studio/sanity.types.ts` and `sanity.schema.json` are
build artifacts of the schema.

**Implication:** Run `npm run sanity:typegen` in `frontend` after any schema change and commit
the results — they are tracked, and stale ones break the build. Derive component prop types from
the generated query result types (see `frontend/sanity/lib/types.ts`) so they cannot drift from
the GROQ projection.

---

## 6. Working agreements

### 6.1 Placeholder links are `#`

**Status:** Implemented

Links whose real path is not yet known are `#`, and no page is created for them.

**Why:** An obvious placeholder beats a guessed URL that might resolve somewhere wrong.

**Implication:** Never invent a plausible external URL (a social profile, a document link) to
fill a gap. Use `#` and list what is outstanding.

### 6.2 Deferred work is recorded, not silently dropped

**Status:** Implemented

Every spec in `docs/superpowers/specs/` ends with a deferred-work section.

**Implication:** When you descope something, write it down there with enough context to act on
later, and open a GitHub issue for it (see AGENTS.md "Deferred work") so it is tracked outside the
spec.

### 6.3 Content-shape contracts get an executable check

**Status:** Implemented

There is no test framework. Where a contract lives partly in content rather than in code — and so
cannot be caught by the compiler — write a script that asserts it against the dataset.
`studio/scripts/verifyPageRouting.ts` is the example: it exercises the real Presentation filters
and fails on a wrong or ambiguous match.

**Why:** Presentation resolution, derived URLs and sibling-slug uniqueness all depend on document
data. Every one of them can break with the code still compiling and the site still building.

**Implication:** Import the definitions under test rather than restating them, or the check drifts
from the thing it is checking. Run these after any change to the hierarchy or the routes.

### 6.4 Destructive content scripts get a dry run first

**Status:** Implemented

`migratePageHierarchy.ts` takes `--dry` and prints its full plan without writing.

**Why:** Its first dry run is what revealed that GROQ's `match` is word-tokenized rather than a
literal glob, so a slash pattern was selecting every page instead of the nested ones. That would
have been a silent, dataset-wide mistake.

**Implication:** Anything that rewrites existing documents should support a dry run, and the plan
should be read before the real run.

---

## 7. Page-builder blocks

Ported from the nlb-v2 WordPress theme. Design: [the blocks spec](superpowers/specs/2026-10-07-wp-blocks-migration-design.md).

### 7.1 One object type and one component per block

**Status:** Implemented

Each block is a Sanity object type in `studio/src/schemaTypes/objects/`, listed in
`page.pageBuilder`, rendered by `frontend/components/blocks/<Name>.tsx` and registered in
`BlockRenderer`. Markup is ported 1:1 from the theme's `render.php`.

**Why:** The page builder already worked this way for `heroVideo`, and Presentation's
click-to-edit depends on the `data-sanity` wrapper `BlockRenderer` adds.

**Implication:** Add a block by adding all three. Query branches for blocks with references, files
or Portable Text go in `pageBuilderFields` in `queries.ts`.

### 7.2 Required fields replace the theme's placeholder copy

**Status:** Implemented

`heroImage` requires eyebrow, heading and image, and `heroSecondary` requires its image. The theme
fell back to "A short, punchy headline goes here." and to the page's featured image.

**Why:** A Sanity page has no featured image, and placeholder copy that ships by accident reads as
content. Hero-secondary's eyebrow still falls back to the page name.

### 7.3 A jump nav is derived from the content, never authored

**Status:** Implemented

`jumpNavContent` builds its left-hand nav from the content's H2 headings. Ids come from
`frontend/sanity/lib/jumpNav.ts` and are checked by `frontend/scripts/verifyJumpNav.mts`.

**Why:** Editors maintain the content once, and the nav cannot drift from it.

**Implication:** H1 is not offered inside the content, so H2 always means a nav section; H3 and below nest inside it. (Changed from H3 on 2026-10-07: the editor now offers H2.)

### 7.4 GROQ fragments are constants, not functions

**Status:** Implemented

A function call inside a `defineQuery` template literal widens the query's type to `string`, and
typegen's result map (keyed by the literal) no longer matches, so the result type collapses to `{}`.
Shared fragments (`markDefsFields`, `linkFields`, `pageBuilderFields`) are plain constants.

### 7.5 The theme's palette maps onto the Figma tokens

**Status:** Implemented, two discrepancies to confirm with the designer

The theme's `warm-neutral-*` and `brand-*` colours map to the nearest `dusty-heath`, `moody-moor`
and `lowlands` tokens. The theme's `warm-neutral-800` (#4b4234) maps to `moody-moor-600`
(#533b28), which is noticeably redder. The Lowlands hero panel keeps the theme's `#5F8154` rather
than `lowlands-800` (#63795b).

## 8. Absorbing nlb-design

The standalone `nlb-design` project (a Next.js build of the Figma designs with hard-coded content)
is absorbed as Sanity-driven blocks. Design: [the absorption spec](superpowers/specs/2026-10-07-absorb-nlb-design-design.md).
Its docs now live in [design/](design/README.md).

### 8.1 Where nlb-design and a theme-ported block overlap, nlb-design wins

**Status:** Implemented (Phase A)

Basic - Left Right Text, Hero - Tertiary (with an H2 option standing in for nlb-design's Section
Intro), Hero - Image (nlb-design's Hero Quaternary) and Timeline (its History Slider) take
nlb-design's design. Mission Statement and CTA Contact are new blocks.

**Why:** nlb-design is the newer, Figma-faithful build; the theme port was a stopgap.

**Implication:** Don't consult the WordPress theme for these blocks. Phase B (cards, news and
events previews, FAQ, people and project grids, with their content types) is still to do.

### 8.2 The headline system was replaced, not added to

**Status:** Implemented

`--text-display-*` and `--text-headline-*` in `tokens.css` are nlb-design's fluid clamps (plus
`--text-headline-2xl`), and the `text-headline-*` utilities carry the serif heading style (-0.05em,
1.1). `--tracking-wide` is 2px; tags and eyebrows use it. The slice 1 `text-h1`..`text-h6`
utilities were removed and their users moved to `text-headline-*` by visual size.

**Why:** Three parallel heading scales would have drifted. One scale, from Figma.

**Implication:** The footer's `text-headline-base` now also gets the heading style. Its explicit
`leading-[1.3]` still wins, but it gains -0.05em tracking: check it against the design
([#14](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/14)).

### 8.3 Differences kept on purpose

**Status:** Implemented, to confirm with the designer ([#14](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/14))

- Hover overlays: nlb-design uses translucent mixes, `tokens.css` has solid hexes. The UI CSS uses
  its own `--ui-hover-darker` / `--ui-hover-lighter` and leaves `--color-hover-*` alone.
- `tf-px` keeps this repo's clamp, not nlb-design's.
- Basic - Left Right Text buttons are Primary, Secondary or Ghost (the design system's button
  styles, Primary by default): the Figma links given did not specify one.
- The light-brown Hero - Secondary uses nlb-design's `decorative-line-hero.svg`, the closest local
  match to the Figma vector.

### 8.4 Rich text offers H3-H6, and anchor links

**Status:** Implemented

`blockContent` no longer offers H1 or H2 (a page's main heading belongs to the block's heading
field), and gains an **Anchor links** item: a stack of link rows, each a label, a link and an arrow
or download icon, 16px apart.

## 9. Phase B: content types and data-driven blocks

Design: [the absorption spec](superpowers/specs/2026-10-07-absorb-nlb-design-design.md), Phase B.

### 9.1 Content is documents, categories are referenced documents

**Status:** Implemented

`article`, `event`, `staffMember`, `commissioner` and `faq` are documents; `newsCategory`,
`department` and `faqCategory` are the referenced taxonomies (slug is the key, title the label,
`order` sets the display order). `nlb-design`'s `CardStaff` hard-coded three department labels;
here the tag is the department document's title.

**Why:** The client extends categories without a deploy; restating them in code would drift.

**Implication:** A reference to an unpublished taxonomy dereferences to null, so every consumer
filters nulls.

### 9.2 "Upcoming" is computed, in New York time, and refreshes hourly

**Status:** Implemented

The events query keeps events whose end (or start, with no end) is not before `$now`, which the
page passes as the start of the current hour (`currentHour()` in `frontend/sanity/lib/dates.ts`).
All dates and times are shown in `America/New_York` (event datetimes are also entered in it:
`displayTimeZone` on the Studio fields), checked by `frontend/scripts/verifyDates.mts` (also under
another `TZ`). The landing page and the catch-all route set `revalidate = 3600`.

**Why the parameter:** next-sanity caches its fetches with no expiry, and a route's `revalidate`
does not override a fetch's own setting, so `now()` inside the query would be frozen at whatever
Sanity answered first. Putting the hour in the params changes the cache key every hour, so the next
hourly regeneration asks again. An ended event can therefore stay up to an hour late.

**Implication:** Nothing about an event being upcoming is stored. Any other time-relative query
needs the same treatment.

### 9.3 Articles take an optional link until they have pages

**Status:** Implemented

`article.link` is the shared link object. A news tile is a link only when it resolves; otherwise it
is a plain tile. Per-article pages, filters and pagination are slice 3
([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)).

### 9.4 The FAQ accordion is a heading, a button and a sibling answer

**Status:** Implemented

`nlb-design` nested a paragraph inside a button, which is invalid HTML. Here the heading wraps a
button (`aria-expanded`, `aria-controls`) and the answer is a sibling `div`, `hidden` when closed.
Answers are rich text.

### 9.5 `CardProject` renders the existing map projects

**Status:** Implemented

One "project" in this repo: the map property. Its tags are its property types and resources. The
WordPress theme's separate work-"project" type is not carried over. `CardNews` is not ported (no
consumer); see the spec.

### 9.6 Assumptions to confirm with the designer

**Status:** Implemented, to confirm ([#14](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/14))

`nlb-design` has the cards but no archive pages, so the grid column counts (staff 4, commissioners
3, projects 4), commissioners shown as "Since Month YYYY", and the "No upcoming events right now."
message are assumptions.

## 10. News article pages and the map teaser

Design: [the news article and map teaser spec](superpowers/specs/2026-10-07-news-article-and-map-teaser-design.md).

### 10.1 Articles live at /news/<slug>, as a static route

**Status:** Implemented

`app/news/[slug]/page.tsx` renders an article (Figma: news_content_desktop). It is a static route,
so it wins over the catch-all that owns CMS pages: a CMS page can sit at `/news` (the archive) but
not beneath it. An unknown slug is a 404. Presentation resolves `/news/:slug` to the article, and
the route is listed before the page routes because `/news/<slug>` also fits their two-segment
pattern.

**Implication:** Don't create CMS pages whose path begins `news/<something>`.

### 10.2 A news tile goes to the article, unless it has its own link

**Status:** Implemented

`article.link` is now an optional override (an external story). A tile goes to it when it resolves
(not empty, not `#`), otherwise to `/news/<slug>`. A call to action tile with no link stays a plain
tile.

### 10.3 The Share row: copy link, Facebook, LinkedIn

**Status:** Implemented. Instagram is left out: it has no web share address.

The buttons read the page address in the browser when clicked (`frontend/sanity/lib/share.ts`,
checked by `frontend/scripts/verifyShare.mts`), so no site URL setting is needed and nothing is
computed on the server. Copy-link success and failure are announced.

### 10.4 "More news" has no call to action tile

**Status:** Implemented, until the news archive exists
([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11))

The page shows up to three other articles, and the section is hidden when there are none.

### 10.5 The Map Teaser is artwork, not a live map

**Status:** Implemented, to compare with Figma ([#15](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/15))

The block is the Figma Interactive Map Block: text on a brown panel, and a map illustration with a
pin, a card for one featured `project`, and a button. Figma's absolute positions became
percentages of the map panel's width at `md:` and up, and a stacked layout below: an assumption to
check.

## Known outstanding items

Carried from [the footer spec](superpowers/specs/2026-07-29-footer-globals-design.md):

- Nine menu links and three social URLs are `#` placeholders awaiting real values.
- Newsletter submission has no provider, action, or validation.
- Cookie Settings needs a consent manager; it is a JS trigger, not a URL.
- `/map` and the seeded `explore/interactive-map` page overlap; one should redirect.
- The Studio's Pages list is flat. It shows each page's resolved path in the subtitle,
  but does not nest children under their parent, which gets harder to scan as pages are added.
- Markers and boundaries render only once Mapbox fires `load`, which needs the style request to
  `api.mapbox.com` to succeed. If a dev server is started without `NEXT_PUBLIC_MAPBOX_TOKEN`
  available, the canvas and controls still appear but nothing is drawn on them — an empty map is
  not evidence that the data is wrong. Verify map *data* separately from map *rendering*.
- The boundary file currently in Sanity was generated from the geometry that used to be inline in
  `properties.ts`, purely so the map keeps working until the client's real export arrives. It lives
  at `studio/scripts/data/boundaries.geojson` and uses the project slug as each feature's `id`.
- `project` has no page of its own and no body content. Explore → Properties is still `#`.
- Renaming an ancestor's slug silently changes every descendant URL (2.3). There is no redirect
  mechanism for the old paths (tracked in [#9](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/9)).
- Mobile footer breakpoints are assumptions awaiting designer confirmation.
- `frontend/tailwind.config.ts` is vestigial under Tailwind v4 — `globals.css` uses
  `@import 'tailwindcss'` with `@theme` and no `@config`, so the file is never loaded. Its
  `green` / `yellow` scales are unrelated to the brand palette.

## Content model reset (2026-10)

- Removed the `post`, `person`, `commissioner`, `staffMember`, `department`, `commissionersPage` and
  `staffPage` types, with the /posts route and its components. The Studio's "Page Content" folder is
  now a flat "Pages" list.
- `settings.landingPage` references the `page` shown at `/`; Presentation's `/` route resolves to it.
  With none set, `/` redirects to `/map`.
- `studio/scripts/cleanupRemovedTypes.ts` deleted every page and all orphaned documents, and turned
  menu links to deleted pages into `#` placeholders. Re-run `seedFooterContent.ts` to recreate pages.
