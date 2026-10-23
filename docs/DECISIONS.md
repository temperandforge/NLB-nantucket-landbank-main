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

### 1.7 Properties are the map's parcels, and their categorisation is referenced

**Status:** Implemented

`property` is a Land Bank property — the parcels, beaches, trails and ponds on the interactive map.
It replaced the hardcoded array in `frontend/app/map/properties.ts`. (The old `project` type was
migrated into it; a new, unrelated `project` type was introduced later — see 1.7a.) Categorisation is by reference
to `propertyType` and `resource` documents.

**Why:** The taxonomies were TypeScript union types plus parallel label maps, so adding a category
meant a code change and a deploy. As documents, the client owns them.

**Implication:** The frontend must not restate the category list. Filter options come from the
documents, and `frontend/components/map/types.ts` derives its types from the generated page-builder block types.
A dereferenced taxonomy entry is null when its document is unpublished, so consumers filter those
out rather than rendering a blank option.

### 1.7a Projects are separate from properties

**Status:** Implemented

`project` is an initiative the Land Bank carries out (image, description, link), categorised by
referenced `projectType` documents and optionally pointing at the `property` it happens on. It is
not on the map. Project Grid, Project Preview and Image Carousel read projects; the map and the
Property Archive read properties. Properties and projects have separate type taxonomies.

**Why:** A parcel and an initiative are different things with different editors' needs; reusing
`property` for both forced projects to carry map data and parcel categories.

### 1.8 A taxonomy's slug is the stable key, its title is the label

**Status:** Implemented

Both `propertyType` and `resource` carry a slug and a title. The map's URL filters use the slug
(`?propertyType=beach`, on the page that carries the Map Explorer block).

**Why:** Filter state is shareable and bookmarkable. Keying off the title would break every shared
link the moment someone fixed a typo.

**Implication:** Renaming a title is safe; changing a slug breaks existing links. The active-filter
chips look their label up from the fetched options, so a slug left in a URL for a category that has
since been deleted still renders as itself instead of blank.

### 1.9 Boundary geometry lives in one file, not on the documents

**Status:** Implemented

The client maintains a single GeoJSON FeatureCollection covering every boundary, stored on
`projectSettings.boundaryData` (generated from an uploaded file; see 1.13). Each project stores `boundaryIds`, naming every feature in it that belongs to that property — most projects have one, some (e.g. a preserve split across many GIS parcels) have several.

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
in `frontend/components/map/types.ts`.

**Why:** The popup design predates the move to Sanity and used a hardcoded `Property` type whose
resource values were underscored (`handicap_accessible`). The `resource` documents use hyphens
(`handicap-accessible`), so every badge would have silently stopped rendering.

**Implication:** Changing a resource's slug breaks its badge. Naming them in one constant means
that dependency is findable rather than buried in a string comparison. Popup values are interpolated
into `setHTML`, so all authored text is escaped first.

### 1.11 The boundary picker reads the real file

**Status:** Implemented

`boundaryIds` uses a custom Studio input (`studio/src/components/BoundaryIdsInput.tsx`, backed by
the useBoundaryOptions hook) that loads the uploaded file, offers the identifiers it actually
contains, and flags a stored value that is not among them. It is a multi-select — a project can be
several parcels, and each is checked against the file independently so a stale one among several
is visible on its own.

**Why:** A mistyped identifier produces a property that silently never draws on the map, with
nothing in the Studio to indicate why. Across hundreds of parcels that is the likeliest failure
mode in the whole feature.

**Implication:** The input degrades to an explanatory message and the raw stored value when no file
is uploaded, when it cannot be read, or when no feature carries the configured property — never a
blank control with no explanation.

### 1.12 Dropdown column headings are a `group` string on `menuLink`, not a third menu level

**Status:** Implemented

The Figma About Us dropdown has Purpose / People / Other columns. They are an optional `group`
string on `menuLink`; the two-level cap in 1.2 is unchanged.

**Why:** The cap exists so invalid half-states can't be authored, and Sanity does not model
recursive objects cleanly. A third level would break both.

**Implication:** Headings are authored per link. Consecutive links with one heading form a column;
interleaved headings (A, B, A) stay separate and render as three. The footer ignores `group`.
Renaming a heading means editing each link under it. The grouping rule lives in
`frontend/sanity/lib/menuGroups.ts` and is checked by `frontend/scripts/verifyMenuGroups.mts`.

### 1.13 Map files are converted to GeoJSON in Studio; the frontend reads only the result

**Status:** Implemented; live verification pending

Editors upload GPX, KML or KMZ (and GeoJSON) to `boundarySource` / `trailsSource` on Properties
Settings. The Studio input (`studio/src/components/GeoFileInput.tsx`, library in
`studio/src/lib/geo*.ts`) converts it to GeoJSON at upload time, shows a report, and on Apply writes
the original to `*Source` and the converted file to `boundaryData` / `trailsData`. The generated
fields are read-only. The frontend only ever reads `boundaryData` / `trailsData`.

`FID` is the default ID property (`boundaryIdProperty`). Fallbacks to it live in `queries.ts`,
`MapboxMap.tsx`, `useBoundaryOptions.ts` and `BoundaryIdInput.tsx`.

**Why:** The client supplies whatever their GIS exports, not hand-built GeoJSON. Converting once, in
Studio, means a bad file is rejected at upload with a report instead of failing silently on the map,
the original stays downloadable, and the frontend has one format to handle. Rejected: converting at
render time in the frontend (every visitor pays for it, and failures surface only on the live map),
and a server function (extra infrastructure and credentials for a task the browser can do).

**Implication:** A KMZ's attribute table is not in structured fields; it is an HTML table inside each
placemark's description, and the converter parses it out so `FID` is available. Names are not IDs: a
KMZ has repeated and blank names (the client's has 150 distinct names across 276 features, 21 blank),
so identifiers come from the ID property, never the name. Replacing a file does not re-point any
property (see 1.9). Existing properties have no `boundaryIds` yet, so no boundary polygons draw until
they are populated (#65). Waypoints, point features and elevation are dropped (#66).

**Implementation status:** Conversion library, schema, input and `verifyGeoConversion.ts` are in. A
live Studio upload, one-Apply-one-edit, the draft id path, real-browser parsing of the client's files
and map rendering have **not** been exercised; that is tracked in #69. Follow-ups: #64, #67, #68.

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
`/` for the lookup. More specific routes still win — `/news/<slug>` matches
`app/news/[slug]` before the catch-all is considered. Adding a real static route above
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

**Update (2026-10-15):** The footer signup is now the `Newsletter Signup` `form` document, referenced
from `footer.newsletterForm` and rendered inline by `FormRenderer variant="inline"`, so it uses the
same validation, honeypot, reCAPTCHA and stored `formSubmission` as every other form. It is still
disabled when the reference is unset, unpublished or has no fields, so the rule above still holds
for the fallback. Seeded by `studio/scripts/seedNewsletterForm.ts`, which only fills an empty
reference. Signups are stored, not synced to a list ([#63](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/63)).

### 4.9 The header and banner are Globals singletons, and the header hides on scroll down

**Status:** Implemented

`header` (`_id: 'header'`) holds the main menu reference; `siteBanner` (`_id: 'siteBanner'`) holds
the announcement. Both are singletons under Globals. The header is rendered once from the root
layout and is sticky. Banner dismissal is stored in `localStorage`, keyed by a hash of the message,
so a changed message re-appears; storage access is guarded and the banner renders without it.

**Why:** One header for the whole site belongs in the root layout. Hiding on scroll down returns
space to the content; revealing on scroll up keeps navigation close.

**Implication:**
- The scroll rule lives in `frontend/components/header/headerScroll.ts` and is checked by
  `frontend/scripts/verifyHeader.mts`. Change it there, not in the component.
- **The banner lives inside the sticky shell, on the homepage only.** `Header` passes it to
  `HeaderShell` as a `banner` slot, so it sticks and hides with the bar; the shell's page gutters
  are on an inner wrapper so the banner can span the full width. `SiteBanner` returns null unless
  `usePathname()` is `/`. Because the banner is part of the header, the hide threshold is the plain
  80px offset (it used to be banner height + 80 when the banner scrolled away on its own). On the
  homepage the header is taller than `--header-height` by the banner's height; `--header-height`
  still describes the bar alone.
- `--header-height` is the single source for anything sized against the bar. The map uses it;
  size new full-height regions from it rather than a literal.
- The real content seed, `studio/scripts/seedHeaderContent.ts`, is idempotent and non-destructive
  (it supports `--dry`).
- Search is built; see 4.10.

### 4.9a The desktop footer is four stacked bands (2026-10)

**Status:** Implemented

The footer's contact info no longer sits beside the newsletter signup. Desktop is four bands 80px
apart: newsletter with the social icons top-right, the contact grid, the menu, then the legal row.
The contact grid and the menu share one five-column grid (240px columns, 40px gutters), so their
columns line up. Footer text is 16px (`body-base`) on desktop; the newsletter headline is
`headline-lg` and its input and button are 48px. There is a single `SocialLinks` instance, which
sits under the form on mobile and top-right from `md`.

**Why:** It follows the revised Figma frame (node 89:131; mobile 636:1331). Measured values are in the
[footer spec](superpowers/specs/2026-07-29-footer-globals-design.md#measured-values).

**Implication:** The contact columns render in CMS order (Contact, Address, Office Hours), where Figma
shows Office Hours second. That is content in Sanity, not layout.

### 4.10 Site search is a server-rendered `/search` page, fed by one GROQ query

**Status:** Implemented

The header's search field (a toggle and full-width panel on desktop, a field in the menu on mobile)
submits to `/search?q=<words>`. The page reads `q` on the server, runs `searchQuery` and renders the
ranked results; `?type=<kind>` narrows them client-side, like every archive filter. No Figma frame
exists for the results page, so it is composed from the archive patterns (record-row hover, filter
tabs, tracked mono labels) and the nav field itself.

**Why:** Server rendering keeps the page working without JavaScript (the field is a plain GET form)
and makes a results address shareable. One query keeps ranking in one place.

**Implication:**
- A word is a prefix pattern and every word must match, in any field. Titles weigh 8x the rest.
  Parsing, snippets, highlighting and tabs are in `frontend/sanity/lib/search.ts` and are checked by
  `frontend/scripts/verifySearch.mts`; change them there.
- Searchable means "has a destination": pages (not `pathOnly`), news, projects, events, records with
  a file, and properties that have a `link`. Adding a type means the GROQ filter, `SEARCH_TYPES`,
  its label and its href in `search.ts`, together.
- `/search` is a static route, so it wins over the catch-all: a CMS page cannot be published at
  `/search`.
- The field's label uses the website file's 14px / 1.54px tracking, not the 12px / 1.32px
  "mono/tracked" style the dropdown headings use.
- The "No search results" error renders under the field on the results page, not in the header
  panel: a search is a navigation, so the zero-result answer arrives with the page.
- What is not searchable, and why, is tracked in
  [#50](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/50).

### 4.11 Load-in motion: CSS tokens, opt-in `<Cascade>`, `<PageTransition>` per page

**Status:** Implemented on branch `worktree-load-animations`, pending merge

The first screen cascades in word by word, and navigation is a short animated handoff, with archive
card images morphing into their detail hero. No animation library and no client JS: server-rendered
`<Cascade>` plus CSS, and React `<ViewTransition>`. Design:
[load-in animations spec](superpowers/specs/2026-10-23-load-in-animations-design.md).

**Why:** An earlier attempt (PR #56) used auto-detection and scroll reveal and had the wrong feel.
Explicit opt-in per headline keeps the motion predictable and keeps it off every page that doesn't
want it.

**Implication:**
- **Motion tokens live in `frontend/css/motion.css`** (duration, easing, cascade step,
  page in/out durations). Every animation rule sits in one guarded block, so reduced-motion and print
  users never get a hidden start state; `frontend/scripts/verifyMotionCss.mts` checks it. Tune the
  feel there, not in components.
- **`<Cascade>` is opt-in, one line per headline.** It renders text that carries Sanity stega
  characters unsplit (splitting would break the visual-editing markers) and must never call
  `draftMode()`, which would make every page dynamic. A hero description uses
  `variant="body"` (a quicker, never-blurred sweep, capped at 48 words). Word splitting is in
  `frontend/sanity/lib/cascade.ts`, checked by `frontend/scripts/verifyCascade.mts`.
- **The rest of the page enters through `data-enter`, in CSS only.** `BlockRenderer` tags the
  first two blocks `load` (on a timer) and the rest `scroll` (CSS scroll-driven animations, inside
  `@supports (animation-timeline: view())`, so Firefox and Safari before 26 see them static).
  Detail pages tag their sections with `<Enter>`. Inside a tagged block the outermost heading,
  paragraph, image, list item, `.button` or `[data-part]` animates; a card that is not a list item
  needs `data-part`; a morph target's hero wrapper needs `data-morph`. The shared parts selector is
  pinned by `verifyMotionCss.mts`, and `enterAttrs` by `verifyEnter.mts`. Studio Presentation turns
  it off via `data-draft` on `<html>`, set by `DraftModeToast`.
- **`<PageTransition>` belongs in each `page.tsx`, never a layout.** `<ViewTransition>` enter and
  exit do not fire in a layout, because layouts persist across navigations. A new route gets no
  transition until its `page.tsx` wraps its content.
- **Internal links go through `<Link>`** (via `AnchorLink`), never a plain `<a>`: an `<a>` is a full
  page load with no prefetch and no transition. External links stay `<a>`.
  `frontend/scripts/verifyLinks.mts` checks the audit.
- **The morph is wired only for archive cards whose destination renders a hero** (properties and
  projects). The card takes an opt-in `morph` prop that only the archive grids pass; "More
  properties" and similar grids leave it off, or the card would get an old-only snapshot. A property
  with no hero image gets the soft handoff. News has no morph (no hero on `ArticleView`), nor do
  people and staff cards.
- The header is anchored with its own `view-transition-name` so it never moves. For verification builds, use
  `NODE_ENV=production` (this shell exports `development`, which breaks `next build`); view
  transitions cannot be verified in the in-app browser pane, only real Chrome.
- The new page's cascade starts after the soft-handoff delay (the page fades in over the old one's
  180ms exit); there is no separate navigation delay. Only `opacity`, `transform` and `filter`
  animate: no layout shift (CLS 0 on every page measured; `/about-us/history` showed a constant 0.0000087 with and without `motion.css`). LCP on a page with a Cascade h1 (production build, real Chrome, median of 5, with vs without `motion.css`): `/about-us/history` 204 ms vs 156 ms (+48 ms, run spread 144-284 ms), `/properties/head-of-the-plains` 148 ms vs 152 ms (-4 ms). The LCP element is the hero image (IMG) on both, not the headline, and the spread across runs is larger than the difference, so no LCP effect is established; it is not proven absent either.
- Not done, each tracked: scroll-in cascade
  ([#86](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/86)), news morph
  ([#87](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/87)), back/forward
  transitions ([#88](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/88)),
  header snap-back ([#89](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/89)).

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

### 6.x `next-sanity` is pinned to an exact version

**Status:** Implemented

`frontend/package.json` pins `next-sanity` to `13.0.8` (no caret).

**Why:** `13.3.x` types every string from `sanityFetch` as `StegaString` by default (the client has
`stega.studioUrl` and `defineLive` has a `serverToken`). Every component prop typed from the
generated query types then fails `next build`'s type check - the dev server hides it, Vercel does
not. A lockfile refresh (the Node 26 bump) pulled it in silently and broke the deploy.

**Implication:** Bump it deliberately, and in the same change either handle `StegaString` (clean with
`stegaClean`, or pass `stega: false` where visual editing overlays aren't needed) or confirm
`npm run type-check` passes. Run `type-check` before pushing any dependency or lockfile change.

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

`article.link` was the shared link object (replaced by `externalUrl`, see 10.2). A news tile is a link only when it resolves; otherwise it
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
3, projects 4), and the "No upcoming events right now."
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

`article.externalUrl` is an optional plain URL (http/https), for a story that lives on another site. It
replaced the shared `link` object, whose page-reference and internal-path options had no use now that
every article has its own page (`studio/scripts/migrateArticleLinks.ts`). A tile goes to it when it is
set and not `#`, otherwise to `/news/<slug>`. A call to action tile with no link stays a plain
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

## 11. The staff, commissioner and FAQ archives

Design: [the archives spec](superpowers/specs/2026-10-07-staff-commissioner-faq-archives-design.md).

### 11.1 An archive is an ordinary page built from blocks

**Status:** Implemented

Staff, Commissioners and FAQs are CMS pages (a header block plus the People Grid or FAQ List), seeded
as drafts under About Us by `studio/scripts/seedArchivePages.ts`. Each one's address is its own slug
and parent, so it can be changed per archive at any time in Studio. Links that point at a page by
reference follow the move; old bookmarked addresses do not, which needs redirects
([#9](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/9)). No Site Settings
entry per archive: nothing in code needs to find an archive page.

### 11.2 Department tabs come from the staff, and the choice lives in the address

**Status:** Implemented

The People Grid's tabs are derived from the staff on the block (`frontend/sanity/lib/archiveFilter.ts`,
checked by `frontend/scripts/verifyStaffFilter.mts`): one per department with at least one member, in
the department's `order`. The chosen department is `?department=<slug>`, read with `useSearchParams`
and changed with the History API, so a filtered view can be shared without a server request. The
server render is "All".

The tab row is a shared `components/ui/FilterTabs` and the address handling a shared
`useQueryFilter` hook, so any archive block can filter the same way. The Project Grid uses them with
`?type=<slug>`, tabs from the property types on its projects (resources are amenities, not
categories, and get no tab). The Project Grid's card follows the Figma projects archive (two
columns, types as tags over the image, name below, no description), replacing the earlier assumed
four-column card (9.6).

### 11.3 The footer links are wired by a guarded script

**Status:** Implemented, to run once the pages are published

`studio/scripts/linkArchivePagesInMenus.ts` changes only the Footer Menu's About Us > Staff and FAQs
links that are still `#`. It refuses to write if a page is unpublished or the menu has unpublished
edits, and prints each change first.

### 11.4 The Commissioners page uses the theme's layout

**Status:** Implemented, to confirm ([#15](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/15))

The Figma node the theme cites no longer exists and the Design System node was not readable, so the
page is the Staff page's header and a three-column grid of the existing commissioner cards.

## 12. The single news page and related news

### 12.1 What every news article page shares lives in one settings document

**Status:** Implemented

`singleNewsPage` (Studio: Globals > Single News Page, fixed id) holds what all news article pages
share, as opposed to one article's own content: the label above the title, the "Published:" and
"Share" labels, and the "more news" section (the News Preview block's own fields, including its
"Hide this block" setting). Other single templates (events, projects) get their own settings
document when they have pages. Every field is optional: the article page falls back to the design's
wording.

### 12.2 "More news" ranks by shared categories and never includes the current article

**Status:** Implemented

`moreNewsQuery` excludes the article being read and orders by how many categories each other article
shares with it, then newest first, so same-category articles come first and a thin category is
topped up with the latest others. It ranks rather than filters, so the section is not left short.
The count of shared categories is wrapped in `coalesce` because it is null for an article with no
categories, and null does not compare with numbers (it let the date decide). The call to action has
no destination until the news archive exists
([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)), so the settings
default to no call to action.

## 13. Job listings

### 13.1 Jobs are documents; the block lists them all

**Status:** Implemented, apply links outstanding ([#16](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/16))

`job` documents (Studio: Jobs) hold the title, a `department` (plain text, shown as the tag and
unrelated to the staff departments; it was a reference to them until `convertJobDepartmentsToText.ts`), description, location, employment type, apply link (the shared `link`) and
`order`. The Job Listings block holds only an eyebrow and heading and shows every job, like the FAQ
List; with no jobs it renders nothing. Location and employment type are free text, not taxonomies,
until the client needs to filter by them. The description is clamped to two lines, as in the design.
`studio/scripts/seedJobs.ts` seeds the three designed jobs and adds the block to Connect With Us as a
draft. Their apply links are `#`.

## 13. The WordPress people migration

### 13.1 Staff and commissioners were migrated by a repeatable, read-only-source script

**Status:** Implemented (run 2026-10-07; the people are drafts until published)

`studio/scripts/wordpress/`: `extractPeople.sh` (read-only; snapshots the local WordPress site to a
git-ignored `people.json`), `people.ts` (a pure transform, checked by `verifyPeopleTransform.mts`),
`importWordpressPeople.ts` (drafts only, `--dry`, `--remove-samples`) and `verifyWordpressPeople.ts`
(compares Sanity back to the source). Photos are uploaded from the uploads folder on disk. A person is
matched on its name within its type and an existing document is never edited, so re-running is safe.
Per the project rule there are no explicit ids; a report maps each WordPress id to its Sanity id.

**Source quirks handled:** the department assignments are stored on the previous theme's `nlb_staff`
posts, not on the current `staff` posts (the same people, joined by name); the taxonomy is called
`department` in the database although the theme code says `staff_department`; titles carry HTML
entities; commissioners' "Term Date" is free text such as "May 2027", so the schema's `termDate` is a
string shown as entered. Two staff (Dean Belanger, Michael Hurff) have no photo in WordPress and none in
Figma. One source value looks wrong and was migrated as is: the commissioner Neil Paterson has the title
"Executive Director".

**Implication:** the same pattern (extract, pure transform with a check, idempotent draft import,
validation) fits the FAQs and news, which are still to import
([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)).

## 14. The WordPress FAQ migration

### 14.1 FAQs follow the people pattern, with the answers converted to Portable Text

**Status:** Implemented (run 2026-10-07; the FAQs are drafts until published)

`studio/scripts/wordpress/`: `extractFaqs.sh` (read-only; queries the tables directly so it does not
depend on the theme registering `faq_category`), `faqs.ts` (pure transform, checked by
`verifyFaqsTransform.mts`), `importWordpressFaqs.ts` (drafts only, `--dry`, `--remove-samples`) and
`verifyWordpressFaqs.ts`. A category is matched on its slug, a FAQ on its question; an existing
document is never edited. Each import writes its own `faqs-import-*.json` report, so it does not
overwrite the people report.

**Answers are converted, not stored as HTML.** The converter handles paragraphs, headings, block
quotes, lists, bold, italic, links and line breaks. H1/H2 become H3 (the editor offers no higher);
images, tables and embeds, and site-relative links (the editor's URL check rejects them), are
dropped and reported. Keys derive from the WordPress id, so a re-run produces the same blocks.

**Ordering.** Every `menu_order` on the site is 0, so a FAQ's order is its position by WordPress id
within its category; categories follow the ACF `term_order` on the term (General FAQs, then Form
Filing). A FAQ in several categories takes the earliest-ordered one.

**Source quirks.** Only 1 of the 6 published FAQs has an answer in WordPress; the rest import with an
empty answer, which Studio's required-field check flags until an editor writes one. The previous
theme's `nlb_faq` posts are test content and are not migrated.

**Samples.** `--remove-samples` deletes the sample FAQs and the `general` and `empty-category`
categories from the Phase B seed before matching (one sample shares a question with a real FAQ).
The `form-filing` category already exists and is reused as it stands.

## 15. The property type and the Properties archive

### 15.1 `property` replaced `project`, and the archive is a block

**Status:** Implemented. The migration ran on 2026-10-07 (150 properties created, 2 with a draft; validation passed) and is safe to re-run (it skips every slug). The page seed ran on 2026-10-07: draft `explore/properties` exists, to be published by the user.

**Note:** the dataset also holds an older draft `property` ("Surfside Beach", slug `a`, created 2026-07-21 under the previous content model). The migration did not create or touch it; delete it in Studio if it is not wanted.

The client wants properties to be the map's document, so `property` replaced `project` (same
fields; the Studio title is "Property"). `studio/scripts/migrateProjectsToProperties.ts` copies each
project into a property **in the same publish state** (150 published, 2 with a draft when it was
written), matched by slug, never editing an existing property, refusing to run if anything other
than a project references a project, and leaving the `project` documents in place
([#26](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/26) to delete them once
the map is verified). `verifyPropertyMigration.ts` compares the two sets.

The archive is a **Property Archive block** on an ordinary page (seeded as a draft
`explore/properties` by `seedPropertiesPage.ts`), so its address is its slug and parent. It has two
dropdown filters, Property Type and Resources, built from the types and resources the properties
use; **any** checked option within a group matches and **every** group with a choice must hold. The
choice is kept in the address as `?type=a,b&resource=c`. The filter functions live in
`frontend/sanity/lib/archiveFilter.ts` with the other archive filters and are checked by
`frontend/scripts/verifyPropertyFilter.mts`. A card with no image shows **Default property image**
from Site Settings, or the staff cards' neutral box when that is unset.

**Deploy order.** The map, the Project Grid, the Property Archive and the Studio's Properties list all
read `property`, which is empty until the migration runs. Run `migrateProjectsToProperties.ts`, then
`verifyPropertyMigration.ts`, **before** the frontend and Studio changes are deployed; otherwise the map
shows no properties.

**Open question.** The seeded top-level Projects page (a Project Grid with copy about conservation
initiatives) now lists properties, so the same beaches and ponds appear under two pages. Whether to
retire it, re-copy it or wait for a real "project" (initiative) type is the client's call.

**Not done:** property detail pages ([#23](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/23)),
renaming the Project blocks ([#24](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/24)),
pagination or search ([#25](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/25)).
Spec: [properties archive design](superpowers/specs/2026-10-07-properties-archive-design.md); plan:
[properties archive plan](superpowers/plans/2026-10-07-properties-archive.md).

## Known outstanding items

Carried from [the footer spec](superpowers/specs/2026-07-29-footer-globals-design.md):

- Nine menu links and three social URLs are `#` placeholders awaiting real values.
- Newsletter signups are stored in Sanity but not synced to a mailing list ([#63](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/63)).
- Cookie Settings needs a consent manager; it is a JS trigger, not a URL.
- Google Tag Manager is not loaded. It needs the client's container id and a consent decision, which
  belongs with Cookie Settings ([#49](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/49)).
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
- Site search covers only content with a destination; people, FAQs and properties without a `link`
  are not searchable ([#50](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/50)).
- `frontend/tailwind.config.ts` is vestigial under Tailwind v4 — `globals.css` uses
  `@import 'tailwindcss'` with `@theme` and no `@config`, so the file is never loaded. Its
  `green` / `yellow` scales are unrelated to the brand palette.

## Content model reset (2026-10)

- Removed the `post`, `person`, `commissioner`, `staffMember`, `department`, `commissionersPage` and
  `staffPage` types, with the /posts route and its components. The Studio's "Page Content" folder is
  now a flat "Pages" list.
- `settings.landingPage` references the `page` shown at `/`; Presentation's `/` route resolves to it.
  With none set, `/` returns 404.
- `studio/scripts/cleanupRemovedTypes.ts` deleted every page and all orphaned documents, and turned
  menu links to deleted pages into `#` placeholders. Re-run `seedFooterContent.ts` to recreate pages.

## 16. The news archive is a page-builder block

**Status:** Implemented. Pagination is not in the Figma design, so every article is listed.

The News page (`our-work/news`) is an ordinary CMS page: a Hero - Tertiary header and the News
Archive block (`newsArchive`), seeded by `studio/scripts/seedNewsPage.ts` (fills an empty page
builder only). The block lists every article newest first, three across (one on mobile), with the
shared `components/ui/FilterTabs` for categories and `?category=<slug>` through `useQueryFilter`,
the same pattern as the Project Grid. Tabs come from the categories the articles actually have.

## 17. Project pages

**Status:** Implemented (2026-10-12). Two manual steps remain: see **Not done**.

A `project` (a Land Bank initiative, distinct from the map's `property`) has a page of its own at
`/projects/<slug>`, a static route like `/news/<slug>`, built from the project's `body` (the same
rich-text definition as Jump Nav Content, `jumpNavBodyMembers`), whose `faqAccordion` block holds the
project's FAQs inline (question + answer items; `FaqItem`'s open state follows Figma 2103:36336). The page address is
derived from the slug, so `project.link` was removed; FAQs have no heading field: the heading is a Section
heading the editor writes above the accordion block; cards, the Image Carousel and Project Preview
tiles all link to `/projects/<slug>` through `projectHref()`. What every project page shares lives on
the `singleProjectPage` singleton: the eyebrow and where it links back (`archiveLink`) and the
"more projects" section, whose projects are ordered by shared project type, then
newest (`frontend/sanity/lib/relatedProjects.ts`, checked by `scripts/verifyRelatedProjects.mts`).
`property`, the map and the Property Archive are unaffected. The jump-nav and project-preview markup
were extracted (`JumpNavLayout`, `ProjectPreviewView`) so the blocks and the page share them.
Spec: [project single page design](superpowers/specs/2026-10-12-project-single-page-design.md); plan:
[project single page plan](superpowers/plans/2026-10-12-project-single-page.md).

**Not done:** active-section highlighting in the nav ([#31](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/31)),
hand-picked related projects ([#32](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/32)).
Manual: run `studio/scripts/seedSingleProjectPage.ts` and `unsetProjectLinks.ts`, and fetch the two
background curve SVGs (see the plan, Task 7). Issue [#23](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/23)
(property detail pages) is superseded for projects.

The jump-nav column is capped to the visible height with the nav scrolling inside it, and its offset
follows the header's hide/show state (`--header-offset`, set by `HeaderShell`).

## 18. Event pages and the Events Grid

**Status:** Implemented (2026-10-12), not yet checked in a browser.

An `event` has a page of its own at `/events/<slug>`, a static route like `/news/<slug>`. The page
address is derived from the slug. `event` gained `slug`, `image` (the grid row's photo) and `body`
(sections and images only: the `jumpNavBodyMembers` block and image members, with no jump nav and no
FAQ accordion, so "Activities" and "Rain Date" are H2s in the body). The page closes with the existing
events strip: `EventsPreview` was split into `EventsPreviewView` (shared with the page, which shows the
next two *other* upcoming events) and the block. Tiles link to the event when it has a slug.

The Events Grid block (`eventsGrid`) lists every upcoming event as a row: image with a date badge,
title, time, place, summary and "View details". Upcoming is computed at render, as for the Events
Preview (9.2). The page's heading is a separate Hero - Tertiary block, as on the News page.
Seeds: `seedEvents.ts` (draft events, no images) and `seedEventsPage.ts` (fills the empty Events page).

**Not done:** the calendar icon is drawn to match the clock and pin, not exported from Figma.
Event images must be added in Studio.

## 19. Public records

**Status:** Implemented. Not built, each with an issue: importing the real records
([#35](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/35)), search and
document-type filters ([#36](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/36)),
manual ordering ([#37](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/37)),
pagination ([#38](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/38)) and
per-category URLs ([#39](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/39)).

Design: [the public records spec](superpowers/specs/2026-10-12-public-records-design.md).

### 19.1 One page, one block, categories as documents

The Public Records page is an ordinary CMS page with a Records Archive block (`recordsArchive`); the
five Figma templates are its tab states, not five pages and not a route. `record` is a document
(title, date, file, category); `recordCategory` is a taxonomy, so the client adds a tab without a
deploy. Tabs come from the categories themselves, so an empty category still has its tab. There is no
"All" tab: the lists mix titled and dated rows under different sort rules, so a combined list has no
sensible order.

### 19.2 Per-category behaviour is data; filters are a registry

A category sets `sortBy` (`dateDesc` or `titleAsc`) and `filters` (an array of keys, today `year`).
All of it is applied by `recordView` in `frontend/sanity/lib/archiveFilter.ts`, checked by
`frontend/scripts/verifyRecordsFilter.mts`. A filter is an entry in `RECORD_FILTERS` plus an allowed
value on `recordCategory.filters` in the studio (one list in two packages, like the page depth in
section 2); a new one needs no change to the block, the hook or the stored documents. A filter value
a category does not offer, or a key the frontend does not know, is ignored.

**Implication:** Changing a category's slug breaks shared `?category=` links; edit the title instead.
A row is labelled by title, else date, else file name, so a record needs only one of them; Studio
warns when a date-ordered or year-filtered category has an undated record. The seed's sort and filter
settings per category are read from the Figma and need the client's confirmation.

## 20. The interactive map is a page-builder block, not a route

**Status:** Implemented

`/map` is removed. The filterable map is the `mapExplorer` block, placed on a normal page
(`explore/map`); the page's heading comes from a Hero Tertiary, so the block has no text
fields. Map Preview stays the lightweight embed (heading, body, no filters). The map code lives in
`frontend/components/map/`, and the block carries its data in its GROQ projection, so there are no
standalone map queries. Filters write to the current pathname.

**Why:** `/map` and the CMS page overlapped, and a route cannot be moved, reworded or given a hero
in Studio. A block can.

**Implication:** There is no redirect: old `/map` links 404. `/` with no landing page also 404s.
`projectSettings.heading`, `intro` and `eyebrow` no longer feed the map and can be removed
(tracked in [#44](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/44)). Two Map Explorers on one page share their URL filters.

## 21. Forms

### 21.1 A form is a document of sections of typed fields

**Status:** Implemented; type-checked and linted but not yet verified in a browser (see 21.5)

**Verified:** schema and generated types (`tsc`, typegen), lint, and `verifyForms.ts` (run with zero
forms present, so vacuous). Not verified: rendering of either placement.

`form` has `sections[]`, each with an optional heading, a column count, and `formField` objects
(one type with a `fieldType`). A form is placed by reference: embedded in Basic Left Right Text's
right-column rich text (`blockContentWithForm`), or chosen on a Contact Form block. Options are
plain strings, and the stored answer is the option text. A show-if may target a dropdown,
multi-select, checkbox group or radio group.

**Why:** Both Figma layouts, and any later form, are the same shape; editors can extend forms
without a deploy.

**Implication:** Choice answers are stored as the option text, so renaming an option detaches
earlier answers and any show-if that names it (Studio flags the show-if).

### 21.2 Validation is shared and always repeated on the server

**Status:** Implemented; logic checked, route not exercised against a live dataset (see 21.5)

**Verified:** type-check, lint, the node check script `verifyFormLogic.mts` for the pure logic
(validation, visibility, listbox keys, rate limit), and code review of the route. Not verified: a
live request, reCAPTCHA, or a stored submission.

`frontend/sanity/lib/forms.ts` decides visibility and validity for both the browser (`FormRenderer`)
and `POST /api/forms/[formId]`. The route re-reads the **published** form and keeps only the answers
the form asks for. It rejects form ids that do not match `/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/` (404),
rate-limits per IP, drops honeypot hits silently with a 200, verifies reCAPTCHA when
`RECAPTCHA_SECRET_KEY` is set, and reports a failed Sanity read as a 500.

**Why:** A visitor's JSON is untrusted. One implementation means the two cannot disagree.

### 21.3 Submissions are stored, not emailed (yet)

**Status:** Implemented; email deferred; not yet exercised against a live dataset (see 21.5)

**Verified:** schema type-check and code review. Not verified: a stored submission, or the weak
reference, against a real dataset with the write token.

`formSubmission` documents hold a snapshot of each question and answer, with a weak reference to
the form, written with a server-only `SANITY_API_WRITE_TOKEN`. Deferred, each with an issue: email
notification (#17), retention (#18), file uploads (#19), role-based access to submissions (#20).
Interim: the in-memory per-IP rate limiter, which is per instance, capped and evicts the oldest
entry (#21), and the general-purpose write token (#22). Issue #12 (the contact form had no backend)
is closed by the storage work, except for email.

**Requires action before go-live (OPEN, the project owner's decision).** Submissions are written to
the content dataset, and `npx sanity dataset visibility get production` returned `public` on
2026-10-07. While it is public, anyone who knows the project id can query stored submissions
(names, emails, phones, addresses) through the Sanity API. Before any real form is published the
dataset must be made private (the frontend already sends its read token), or submissions must go to
a separate private dataset. Related to #20: in draft mode, the browser token used for live preview
can read submissions.

reCAPTCHA: set both `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`, or neither. With
only the secret set, every submission fails the captcha check.

### 21.3a reCAPTCHA v3 is the captcha; notifications will use SMTP

**Status:** reCAPTCHA v3 implemented; SMTP not built ([#17](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/17))

Google reCAPTCHA v3 protects every form. It replaced Cloudflare Turnstile (2026-10-15). There is one
captcha, not a choice between providers.

**Why:** The client wanted no widget in the form. Turnstile's Managed mode drew a visible "Verify
you are human" box in the dark footer; v3 shows only Google's small floating badge, bottom right.
Keeping one provider avoids a second client widget, a provider setting and mismatched-key cases. The
captcha is isolated in `components/ui/form/Recaptcha.tsx` and `sanity/lib/recaptcha.ts`.

**How it works:** the browser loads `api.js?render=<site key>` and, on submit, requests a
single-use token for the action `form_submit`. The route posts it to Google's `siteverify` and
rejects it unless Google accepts it, the score is at least 0.5 and the action matches. The action
string is duplicated in the route because a server module cannot import a value from a `'use client'`
file. Keys: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`, set both or neither. With
neither (local dev) the check is skipped; with only the secret set, every submission fails it.

**Implication:** the script and badge load on every page that has a form, which includes the
sitewide footer, so the badge appears on every page. It sets Google cookies, so it needs the consent
decision tracked with Cookie Settings ([#49](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/49)).
Hiding the badge is allowed only with visible text saying the site is protected by reCAPTCHA and
linking Google's Privacy Policy and Terms of Service. The 0.5 threshold is Google's default and has
not been tuned against real traffic. The badge can overlap content at the bottom right on small
screens.

**Setup:** create a v3 key at google.com/recaptcha/admin for the production, staging and
`localhost` domains. Set the two variables in `frontend/.env.local` and in Vercel. The site key is
inlined at build time, so redeploy after changing it.

**Decided, not built:** staff are notified of submissions over SMTP (nodemailer in the submit route,
env-var configured, skipped when unset), recipients per `form` in Studio, sent after the Sanity
write and never failing the submission, with no confirmation email to the submitter.

### 21.4 Accessibility choices that differ from the obvious

**Status:** Implemented; type-checked and linted but not yet verified in a browser (see 21.5)

**Verified:** type-check, lint, `verifyFormLogic.mts` (listbox key handling) and code review. Not
verified: keyboard, focus and screen-reader behaviour, focus-ring contrast, or the ARIA wiring in a
browser.

- **Focus on form controls adds an outline to the design system's border.** The Input's focus state
  is a 1px `border-light` border, below 3:1 contrast, so focus also draws a 2px `border-dark`
  outline.
- **Radio groups** put `role="radiogroup"` on the fieldset; `required` and `invalid` are exposed
  only there. Choice inputs are named by their field (`name` is the field name).
- **Checkbox groups** carry the `*` in the legend and their error through `aria-describedby`.
- **The multi-select trigger** is `role="combobox"`; focus moves into a listbox while it is open.
- **No native `maxLength`.** Validation and the counter report overflow instead of silently
  truncating typed text.
- **Icons.** Time fields use the Figma clock-2 icon (`Clock2Icon`). The design system has no radio
  icons and the Figma draws the Yes/No pair as squares, so radio groups use the same square icons
  as checkboxes and keep radio behaviour (one answer, arrow keys, one tab stop).
- **A field's `prompt`** is the small text above the control when the section heading already asks
  the question (Figma: the mono heading plus "Select one"). The `label` stays the question: it is
  in the accessible name (as visually hidden text before the prompt), in validation messages and in
  stored answers. The asterisk moves to the section heading.

### 21.5 Verification still to do by a person

**Status:** Not yet run (needs seeded, published forms, a dev server and the write token)

The browser and keyboard pass, and the live POST checks, were not run. To do:

1. **Decide dataset visibility (OPEN, project owner).** See the requirement under 21.3: submissions
   must not go live while the dataset is public.
2. Seed the forms: `cd studio && npx sanity exec scripts/seedForms.ts --with-user-token -- --dry`,
   read the plan, then run it again without `--dry`.
3. Publish the forms and place them on pages (a Contact Form block with "Contact Us", and a Basic
   Left Right Text block with a form in the right column).
4. Run `cd studio && npx sanity exec scripts/verifyForms.ts --with-user-token`.
5. Set `SANITY_API_WRITE_TOKEN` (and, if using reCAPTCHA, both `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`, or neither: with only the secret set every submission fails the captcha check) in `frontend/.env.local`, then start
   the dev server.
6. Keyboard-only pass at desktop and mobile widths:
   - Tab reaches every control in visual order, never the honeypot, and a focus indicator shows on
     every stop including radios and checkboxes; a radio group is one tab stop.
   - Space and arrows operate checkboxes and radios.
   - Single and multi-select share one custom listbox (`ListSelect`); a single select closes and
     returns focus to the button on Enter, Space or a click, and a multi-select stays open. A
     single select cannot be cleared once chosen.
   - Multi-select: Enter, Space and ArrowDown open it with focus in the list; Up/Down/Home/End move;
     typing a letter jumps; Space toggles; Tab closes it and moves on. Escape returns focus to the
     trigger with no validation flash.
   - Tab order after a show-if toggles: "Yes" inserts the dependent field after the radio, "No"
     removes it, and submitting with it hidden does not report it.
   - A failed submit focuses the first invalid field, the alert announces the count, each error is
     read with its field (`aria-invalid`, `aria-describedby`, `aria-required`), and a valid answer
     clears its error.
   - A double submit makes one request; the button reads "Sending…" and is disabled in between.
   - Compare each Input state with the design system node `499-209`.
7. POST against the route: a 422 (invalid answers), a 429 (rate limit), a honeypot hit (200, nothing
   stored), and a valid submission stored with the weak `form` reference.
8. Needs a real browser: the multi-select Escape-focus path, and the reCAPTCHA case with two forms
   on one page (the script is loaded once).

A form that exists only as a draft resolves in Presentation but cannot be submitted there: the route
reads published forms only and answers 404.

## 22. Error pages share one synthesised template

**Status:** Implemented

The Figma design has no error screen, so `app/not-found.tsx` (every 404), `app/error.tsx` (a route
threw) and `app/global-error.tsx` (the root layout threw) share `components/ErrorPage.tsx`, built
from existing pieces: the Hero Tertiary layout, the cream background, the site's topographic line
art, the Button family and the search field. The art is a footpath that ends at a survey pin tagged
with the status; it draws in once and respects `prefers-reduced-motion`.

**Why:** A broken link is a likely first impression for a public land-conservation site, and the
default Next.js screen is unstyled. Nothing here is Figma-sourced, so it should be replaced if the
client designs one.

**Implication:** The 404 links only to home and search. A CMS page's URL can't be known from a slug
(section 2), and an invented one would 404 too. `global-error.tsx` has no site chrome, content
fetches or Sanity: it loads its own stylesheet and fonts. `/` still 404s when no landing page is set
(section 20), so "Back to home" can land on this screen until one is.

## 23. Drag-and-drop ordering, and the FAQ catch-all category

Staff, commissioners, FAQs, and the FAQ, news, project (`projectType`), department and record
categories are ordered by dragging in Studio (the Orderable Document List plugin, which stores a
hidden `orderRank`). Their lists in Studio are the plugin's lists, not the default document lists.
Queries sort `orderRank asc, _createdAt asc`, so nothing sorts alphabetically and a document with no
rank yet falls to the end, oldest first. Filter tabs built from categories (`categoryTabs` in
`frontend/sanity/lib/archiveFilter.ts`) sort by `orderRank`, then the older `order` number, then
title, so non-draggable taxonomies (property types, resources) still work. The old `order` number is
gone from the draggable schemas; existing documents were ranked once by
`studio/scripts/seedOrderRanks.ts` (old `order`, then the name or title they used to sort by, or
oldest first for FAQs), and the old field is left in the data, unused.

FAQs with no category are folded into a catch-all category chosen in FAQ Settings (`faqSettings`, a
singleton under FAQs, field `uncategorisedCategory`) when one is set and published; with none set
they show in a separate list above the categories.

**Why:** The client wants to arrange these by hand, and alphabetical tiebreaks read as arbitrary.
**Implication:** `defineTaxonomy` takes `draggable: true` to switch another taxonomy over, and its
list must then use `orderableDocumentListDeskItem`. A new document lands at the bottom of its list
until dragged. The plugin ranks across every document of a type, so a filtered view (staff by
department) shows a subsequence of the one order.
