# Site Navigation Design

**Date:** 2026-10-07
**Figma (system design — source of truth over the website file):**
[Navigation 61:2](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=61-2&m=dev) ·
[Nav item 615:497](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=615-497&m=dev) ·
[Nav dropdown 633:67](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=633-67&m=dev) ·
[Nav search 704:164](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=704-164&m=dev) ·
[Banner 59:4](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=59-4&m=dev)
**Figma (website):** [Nantucket — Website 1910:9834](https://www.figma.com/design/jDXhDNzEJS26VpXp9JWzIv/Nantucket---Website?node-id=1910-9834&m=dev)

## Goal

Replace the hardcoded `frontend/components/Nav.tsx` stub with the designed site header: a logo, a
primary menu whose items open dropdowns, a search field, a mobile drill-in panel, and a dismissible
banner above it. It renders once from the root layout, is driven by Sanity content, and hides on
scroll down and reveals on scroll up.

## Scope

In scope:

- Sanity: a `group` field on `menuLink`, a `header` singleton, a `siteBanner` singleton, both under
  Globals in the Studio, and the header `menu` document.
- Frontend: `Header`, `NavItem`, `NavDropdown`, `MobileMenu`, `NavSearch`, `SiteBanner`, the
  hide/reveal behaviour, per-feature design tokens, committed logo and icon assets.
- GROQ queries and generated types; a seed script for the header menu.
- A `docs/DECISIONS.md` entry.

Out of scope (see [Deferred work](#deferred-work)):

- Search itself: the results page and the "No search results" state.

## Decisions taken in brainstorming

| Question | Decision |
| --- | --- |
| About Us shows Purpose / People / Other columns, but menus are capped at two levels | The headings are **not** menu items. `menuLink` gains an optional `group` label; the two-level cap is unchanged. |
| Search | UI only, **disabled** in every state. |
| Banner authoring | A `siteBanner` singleton under **Globals**. |
| Placement | Root layout, one header for the whole site, **sticky**. |
| Scroll behaviour | Hide on scroll down, reveal on scroll up. |
| Source of truth | The design-system files win over the website file where they differ. |

## Design reference

Observed in the system design files (the Figma MCP returned screenshots only; exact spacing, type
sizes and colour values are read from the file during implementation and checked against existing
tokens before any are added).

- **Desktop bar.** Cream surface. Logo at the left. Top-level items to the right: *About Us*,
  *Explore*, *Our Work*, *Public Records* each carry a down-chevron; *Transfer Documents* and
  *Connect With Us* are plain links. A square yellow search button closes the row.
- **Nav item** (615:497). States: closed (chevron down, muted text), open (chevron up, full-strength
  text, underline).
- **Dropdown** (633:67). A cream panel under the bar. Either a flat list of links, each with a
  trailing arrow, or several columns, each with a tracked-uppercase DM Mono heading above a list with
  a left rule. Hover shows a yellow arrow and yellow underline. About Us is the three-column variant
  (Purpose, People, Other); the others are single flat lists.
- **Mobile bar.** Logo with a hamburger that becomes a close ×. The open panel lists the top-level
  items with trailing chevrons and the search field pinned to the bottom. Tapping an item drills into
  a sub-panel: the items' groups with headings, and a **Back** link at the bottom.
- **Search** (704:164). Desktop and mobile variants. States: empty (placeholder, arrow), active
  typing (arrow gains a filled square), typed, and error ("No search results" in red beneath the
  rule). A tracked-uppercase "SEARCH" label sits above the input.
- **Banner** (59:4). Full-width green bar, centred light text, a close × at the right. Desktop and
  mobile variants.

## Content model (Studio)

### `menuLink.group` (new, optional string)

The column heading a link appears under in a dropdown. Consecutive links in a `menuGroup.children`
array that share a `group` render together under that heading; links with no `group` render in a
single headless list. The mobile drill-in sub-panel uses the same grouping.

- `menuGroup` and the two-level cap are unchanged. A top-level `menuGroup` is a dropdown; a top-level
  `menuLink` is a plain link.
- Headings come from `group` text, so renaming a heading means editing each link in it. That is the
  trade-off of not adding a third menu type, and it is accepted.
- Validation: none beyond the string type. An empty string is treated as unset.
- The footer menu ignores `group`: the footer renders `menuGroup.label` as its column heading and
  does not read `group`.

### `header` singleton

`_id: 'header'`, enforced in Structure via `S.document().documentId('header')`, listed under Globals
beside Footer.

| Field | Type | Notes |
| --- | --- | --- |
| `mainMenu` | reference → `menu` | The primary navigation. Required to publish. |

The logo is a committed asset, not an editable field (see [Frontend](#frontend)). If the client
wants it editable later, it becomes an `image` field here.

### `siteBanner` singleton

`_id: 'siteBanner'`, under Globals.

| Field | Type | Notes |
| --- | --- | --- |
| `enabled` | boolean | Default off. When off, nothing renders. |
| `message` | string | Required when enabled. Plain text; the banner is one line. |
| `link` | `link` (shared object) | Optional. When set, the message is wrapped in it. |

### Menus

The header menu is a normal `menu` document ("Header Menu") referenced from `header.mainMenu`,
following the "menus are standalone, referenced" rule. The Studio's Globals › Menus list already
shows every menu.

### Seeding

`studio/scripts/seedHeaderContent.ts`, run with
`cd studio && npx sanity exec scripts/seedHeaderContent.ts --with-user-token`.

- Creates the Header Menu with the structure shown in the design: About Us (Purpose: Conservation,
  Recreation, Agriculture; People: Commissioners, Staff; Other: History, FAQs), Explore (Map,
  Properties, Plan Your Visit, Property Use Request, ACK Trails), Our Work (News, Projects, Events),
  Public Records (Meeting Minutes, Meeting Agendas, Annual Reports, Policies, Establishment
  Documents), Transfer Documents, Connect With Us.
- Idempotent: matches the menu by title and the singletons by id and reuses them.
- Links to pages that already exist are real references; links to pages that do not exist yet are
  `#` placeholders, per the placeholders rule. The script prints which is which.
- **Overwrites:** the `header` singleton and `siteBanner` singleton are created only if absent. An
  existing Header Menu's items are replaced only with `--force`. `--dry` prints the plan without
  writing.
- The design file contains typos ("Poperties", "Meting Agendas"); the seed uses the corrected
  spelling.

## Frontend

### Components (`frontend/components/header/`)

| Component | Kind | Responsibility |
| --- | --- | --- |
| `Header` | server | Fetches `header` and `siteBanner`, guards each region independently, composes the rest. |
| `HeaderShell` | client | Sticky wrapper owning hide-on-scroll-down / reveal-on-scroll-up. |
| `NavItem` | client | One top-level entry: plain link or dropdown trigger (closed/open states). |
| `NavDropdown` | client | The panel: grouped columns or a flat list. |
| `MobileMenu` | client | Hamburger toggle, full-height panel, drill-in sub-panel with Back. |
| `NavSearch` | client | The disabled search field, all states rendered for the design but inert. |
| `SiteBanner` | client | The dismissible bar. |

`Header` owns layout only; what an item or dropdown looks like belongs to its component. Grouping
logic (`group` runs → headings) lives in one helper, `frontend/sanity/lib/menuGroups.ts`, used by
both `NavDropdown` and `MobileMenu`.

### Data

`headerQuery` and `siteBannerQuery` in `frontend/sanity/lib/queries.ts`, each constrained by `_type`
and `_id` per the singleton rule. They reuse the existing `menuFields` fragment, extended to project
`group`. The link projection reuses the shared `link` fragment and `pagePath`; no page URL is
derived from a slug alone.

Prop types derive from the generated query result types in `frontend/sanity/lib/types.ts`.

### Placement

`app/layout.tsx` renders `<Header />` above `<main>`, replacing the commented-out `Header` import and
retiring `components/Nav.tsx` and the starter `components/Header.tsx` stub. The skip link stays
first in the tab order. The banner renders above the nav and scrolls away with the page; only the
nav bar is sticky.

The `/map` route is checked during verification: a full-height map and a hiding header can compete
for the viewport. If it needs a different treatment (for example the header always visible, or the
map offset by the header height) that is decided then and recorded, not guessed now.

### Hide on scroll down, reveal on scroll up

`HeaderShell` is `position: sticky; top: 0`. It translates out of view (`-translate-y-full`) on
scroll down and back on scroll up.

- Always shown within a threshold of the top of the page, so it never hides at the top.
- Small scroll deltas are ignored so jitter and rubber-banding do not flicker it.
- Never hides while a dropdown or the mobile panel is open, or while keyboard focus is inside it.
- One passive scroll listener, throttled with `requestAnimationFrame`; no layout reads beyond
  `scrollY`.
- A short ease on the transform, removed under `prefers-reduced-motion`.
- Anchor jumps and skip-link activation reveal it so focus is never on a hidden element.

### Dropdown and mobile behaviour

- Desktop dropdowns open on click (not hover-only), close on Escape, on an outside click, and when
  another item opens. Focus returns to the trigger on Escape.
- Mobile: the hamburger toggles the panel; a top-level item with children drills into a sub-panel,
  **Back** returns; the panel traps no focus but locks body scroll while open.
- Below the desktop breakpoint the desktop bar collapses to the mobile bar; the breakpoint is read
  from the design files and matches the footer's responsive behaviour where they overlap.

### Search

`NavSearch` renders the field in every state shown in the design, but the input and button are
`disabled` and carry `aria-disabled`. Nothing submits. See [Deferred work](#deferred-work).

### Banner

`SiteBanner` renders only when `enabled` and `message` are set. Dismissal is stored in
`localStorage`, keyed by a hash of the message, so a changed message re-appears. Every storage
access is wrapped in try/catch and the banner renders correctly without it. The banner is
server-rendered visible and hidden after hydration if previously dismissed, which avoids a
layout shift for first-time visitors at the cost of a brief flash for returning ones; this is
accepted.

### Design tokens and assets

- Tokens are added per feature, named after their Figma variables, after checking existing tokens;
  near matches are reused and the discrepancy flagged. The Sanity-starter tokens still in
  `globals.css` are untouched.
- The logo, and any icon not already in `components/icons`, are exported from the design-system
  file and committed. The logo is a file in `public/` (large artwork); icons are inline SVG
  components using `currentColor` that keep their own geometry. Nothing is hotlinked.

### Degradation

The header appears on every page, so it never throws. Each region guards itself: a missing `header`
document, an unpublished `mainMenu`, or an unpublished page reference degrades to rendering less
(down to the logo alone); an unresolvable link is dropped, not rendered as a dead item.

## Accessibility

- A real `<nav aria-label="Primary">` containing a list. Dropdown triggers are `<button>`s with
  `aria-expanded` and `aria-controls`; plain items are links.
- Keyboard: Tab through items; Enter/Space opens; Escape closes and restores focus; arrow keys move
  within an open dropdown.
- The mobile toggle is a button with a label that changes between "Open menu" and "Close menu".
- The banner's close button has an accessible name; the banner is not a live region.
- Focus is never left on an element the header has hidden.

## Verification

Per the project rules: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`,
and `npx tsc --noEmit` in `studio`. Generated types and `sanity.schema.json` are committed.

Browser checks (the project has no test framework), with a Mapbox token absent so `/map` shows an
empty canvas with controls; map layout is checked, map data is not part of this work:

- Desktop and mobile widths against the Figma screenshots: closed, each dropdown open, mobile panel,
  mobile sub-panel.
- Hide on scroll down / reveal on scroll up, including at the top of the page, with a dropdown open,
  and with focus inside the header.
- Banner shown, dismissed, reload stays dismissed, message change re-shows it, disabled hides it.
- Keyboard-only run through every dropdown.
- `/map` and a nested page.
- Missing or unpublished header menu renders the logo only.

The seed script is run with `--dry` first and its plan read before the real run.

## Deferred work (a GitHub issue each, linked here before merge)

1. **Site search.** The search field is disabled. Missing: a results page, the GROQ search over
   pages, news, projects and other content, and the "No search results" state. Deferred because the
   design covers only the field, not results, and the scope is a separate feature. The issue is
   opened with the implementation and linked here; the `NavSearch` component carries a `TODO`
   referencing it.

## Notes

- The dropdown design implies the `group` runs are authored in order. Interleaved groups (A, B, A)
  render as three headings; the Studio shows the order, so this is visible to editors.
- Two typos in the design file ("Poperties", "Meting Agendas") are corrected in seeded content only.
- The Figma file's logo is the full-colour badge, replacing the black mark in the current stub.
