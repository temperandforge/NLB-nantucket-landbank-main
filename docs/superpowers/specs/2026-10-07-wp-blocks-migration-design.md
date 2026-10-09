# WordPress theme migration, slice 1: page-builder blocks

Status: draft for review. Source: the `nlb-v2` WordPress theme at
`/Users/jtf/Local Sites/nlb/app/public/wp-content/themes/nlb-v2`.

## Why slices

The theme is too large for one cycle: ~16 ACF blocks, six post types, four filtered archives, FAQ,
ACF options pages and a Leaflet map. It moves over in three slices, each with its own spec, plan and
build:

1. **Blocks and design tokens** (this spec): the self-contained page-builder blocks.
2. **Content types and archives**: staff, commissioners, news, events, public records, FAQ, job
   openings, and reconciling the theme's `property` and `project` with this repo's `project` (the map
   property). Also the five data-driven blocks deferred below.
3. **Globals, filters and content import** from WordPress.

## Goal

An editor composes pages in Studio from the same reusable blocks the WordPress theme offers, with
Presentation live editing, and the Next.js site renders them as the theme does.

## Scope

Eleven blocks become Sanity object types on `page.pageBuilder` (beside the existing `heroVideo`),
each with a React component and a `BlockRenderer` entry:

| Theme block | Sanity type | Notes |
|---|---|---|
| hero | `hero` | eyebrow, heading, body, image |
| hero-image | `heroImage` | eyebrow, heading, image; decorative lines SVG |
| hero-secondary | `heroSecondary` | eyebrow, body, image, `variant` (lowlands / moody-moor) |
| hero-tertiary | `heroTertiary` | eyebrow, heading, body; decorative lines SVG |
| basic-left-right-text | `basicLeftRightText` | left: eyebrow, heading (+level), body, button; right: Portable Text |
| image-carousel | `imageCarousel` | eyebrow, images with captions |
| timeline | `timeline` | entries: year, title, description |
| jump-nav-content | `jumpNavContent` | heading (+level), restricted Portable Text; nav derived |
| download-block | `downloadBlock` | rows: label, file |
| map-teaser | `mapTeaser` | heading, body, placeholder preview |
| contact-form | `contactForm` | heading; disabled state |

Out of scope: `preview-news`, `preview-events`, `preview-projects`, `preview-properties`,
`job-openings` (they list content types that arrive in slice 2), the header, footer and menus
(already built), and any content import.

## Schema design

New files under `studio/src/schemaTypes/objects/`, registered in `index.ts` and added to the
`pageBuilder` array.

- **Field mapping.** `wysiwyg` and InnerBlocks content become Portable Text. `image` becomes a
  Sanity image with hotspot and required alt. `file` becomes a Sanity file. Repeaters become arrays
  of objects.
- **Buttons reuse the shared `link` object** (and the existing `button` object if it fits). The
  theme's `show_button` flag is dropped: a button shows when it is filled in.
- **`heading_level`** (h1 or h2) is kept on `basicLeftRightText` and `jumpNavContent`. It is an
  accessibility decision, not a style, and a page with no hero needs one real H1.
- **Hero-secondary styles** become a `variant` string field with a list of Lowlands (default) and
  Moody Moor.
- **`jumpNavContent` body** is a restricted Portable Text type allowing H3-H6 only. H1 and H2 stay
  reserved for the block's own heading, and H3 is unambiguously "a nav section". The nav is
  derived from the H3s at render, so editors maintain the content once.
- **Required fields replace placeholder copy.** The theme's hero-image falls back to "Eyebrow" and
  "A short, punchy headline goes here." and to the post's featured image. Sanity pages have no
  featured image, so those fields are validated required.
- **Hero-secondary's eyebrow** still falls back to the page name, passed from `PageView`.
- **WordPress `anchor` and `alignfull` supports are dropped.** Blocks are always full-bleed.
- Every block gets a `preview` so the Studio list is readable, and a thumbnail at
  `studio/static/page-builder-thumbnails/<type>.webp` if the insert menu needs one.

## Frontend design

- One component per block in `frontend/components/blocks/`, registered in
  `frontend/components/BlockRenderer.tsx`. Props derive from the generated query types
  (`ExtractPageBuilderType`), not hand-written.
- The `pageBuilder` projection in `frontend/sanity/lib/queries.ts` resolves `file.asset->url` for
  downloads; images follow the existing `SanityImage` pattern.
- **Markup and classes are ported 1:1 from each `render.php`** (decision: port the theme exactly,
  not Figma). Theme-specific helpers (`tf-px`, `tf-max-w`, `text-h1`..`text-h6`, `py-section-*`)
  are recreated as tokens or utilities, added per feature and named after their Figma variables.
- **Token mapping.** The theme's `--color-warm-neutral-*` and `--color-brand-*` are matched to the
  existing `tokens.css` ramps (dusty-heath, lowlands, moody-moor, goldenrod) where they nearly
  match, and any discrepancy is flagged in the plan. No raw hex from the theme is copied if a token
  is within reach.
- **Typography.** The fluid `text-h1`..`text-h6` clamp formulas are ported as utilities if
  `tokens.css` has no equivalent.
- **Assets.** The five decorative SVGs the blocks use (hero-image lines, hero-secondary lines in
  both colours, hero-tertiary lines, plus arrow icon if used) are copied into
  `frontend/public/images/`. Icons used inline become SVG components using `currentColor`.
- **Interactivity.** `imageCarousel` is a horizontally scrolling track, as in the theme (its
  `data-component` has no JS behind it). `timeline`'s prev/next buttons have no behaviour in the
  theme; they are wired to scroll the track in a small client component, since dead buttons read
  as bugs.
- **Jump nav.** A server-side helper reads the H3 blocks from the Portable Text, builds unique
  slug ids, and renders both the nav and the heading `id`s. Unit-level behaviour (duplicate
  headings, empty headings) is covered by a verification script, since there is no test framework.

## Deviations from a pure 1:1 port

1. Placeholder fallback copy becomes required fields (above).
2. Timeline buttons are made functional.
3. `contactForm` renders a disabled "coming soon" state; there is no form backend yet.
4. `mapTeaser` keeps the theme's empty preview box rather than a live Mapbox preview.
5. `anchor` and `alignfull` supports are dropped.
6. The right column of `basicLeftRightText` takes Portable Text only: the theme's inline buttons and Gravity Forms block are not available there.
7. Carousel and timeline scroll regions are keyboard focusable (`tabIndex=0`, labelled region), which the theme's were not.

## Deferred work

Each gets a GitHub issue before this slice finishes, linked here:

- Slice 2 tracking: content types and archives, including the five data-driven blocks:
  [#10](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/10).
- Slice 3 tracking: globals, filters and WordPress content import:
  [#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11).
- Contact form backend (replaces Gravity Forms):
  [#12](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/12).
- Map-teaser live preview:
  [#13](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/13).

## Verification

- `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit`
  in `studio`. Generated files are committed.
- A seed script, `studio/scripts/seedBlockGallery.ts`, run with
  `npx sanity exec scripts/seedBlockGallery.ts --with-user-token`. It is idempotent (matched on a
  natural key), supports `--dry`, and states in its header what it writes: one unpublished "Block
  gallery" page using every block. It never overwrites an existing page.
- The gallery is checked in the browser at desktop and mobile widths against the theme's rendering
  of the same content. No dev server is left running; the user starts one for review.
- Page hierarchy is not touched, so `verifyPageRouting.ts` is not required.
