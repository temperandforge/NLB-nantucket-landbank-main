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

**Why:** URL / page reference / post reference and `openInNewTab` come for free, and link
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

### 1.10 The boundary picker reads the real file

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
`/` for the lookup. More specific routes still win — `/posts/x` matches `app/posts/[slug]` and
`/map` matches `app/map` before the catch-all is considered. Adding a real static route above
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
like `/posts/:slug`, which a two-segment page route would otherwise capture. A `pathOnly` page
reports no location rather than a broken link.

`defineLocations` `select` **does** dereference (`parent->slug.current`), which is what makes
assembling the URL there possible; `verifyPageRouting.ts` exercises that projection so a
regression surfaces.

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
later.

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

## Known outstanding items

Carried from [the footer spec](superpowers/specs/2026-07-29-footer-globals-design.md):

- Nine menu links and three social URLs are `#` placeholders awaiting real values.
- Newsletter submission has no provider, action, or validation.
- Cookie Settings needs a consent manager; it is a JS trigger, not a URL.
- `/map` and the seeded `explore/interactive-map` page overlap; one should redirect.
- The Studio's Flexible Pages list is flat. It shows each page's resolved path in the subtitle,
  but does not nest children under their parent, which gets harder to scan as pages are added.
- `NEXT_PUBLIC_MAPBOX_TOKEN` does not work in local development: no request to `api.mapbox.com` is
  ever made, so the Mapbox style never loads and the `load` event never fires. Markers and boundary
  outlines therefore do not render locally. Pre-existing, and independent of where the data comes
  from — the data pipeline itself is verified separately (see `seedProjects.ts` and section 1.9).
- The boundary file currently in Sanity was generated from the geometry that used to be inline in
  `properties.ts`, purely so the map keeps working until the client's real export arrives. It lives
  at `studio/scripts/data/boundaries.geojson` and uses the project slug as each feature's `id`.
- `project` has no page of its own and no body content. Explore → Properties is still `#`.
- Renaming an ancestor's slug silently changes every descendant URL (2.3). There is no redirect
  mechanism for the old paths.
- Mobile footer breakpoints are assumptions awaiting designer confirmation.
- `frontend/tailwind.config.ts` is vestigial under Tailwind v4 — `globals.css` uses
  `@import 'tailwindcss'` with `@theme` and no `@config`, so the file is never loaded. Its
  `green` / `yellow` scales are unrelated to the brand palette.
