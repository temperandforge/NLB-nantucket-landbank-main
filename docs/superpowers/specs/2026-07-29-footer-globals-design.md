# Footer + Globals Design

**Date:** 2026-07-29
**Figma:** [Nantucket Design System — footer node 89:131](https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=89-131&m=dev)

## Goal

Implement the designed site footer on the Next.js frontend, driven by Sanity content. Introduce a
reusable, nestable menu content type — used here for the footer and legal menus, extended later to
the header — and a `Globals` section in the Studio to hold footer settings and menus.

The newsletter signup form is presentational only in this work; see [Deferred Work](#deferred-work).

## Scope

In scope:

- New Sanity types: `menu` document, `menuLink` / `menuGroup` objects, `footer` singleton
- Studio structure: new top-level `Globals` containing `Footer` and `Menus`
- Footer-scoped design tokens and the three brand fonts on the frontend
- `Footer` component tree, GROQ query, committed Figma assets
- Responsive behavior below 1440px

Out of scope:

- The header menu (the schema is built to accommodate it; wiring it up is separate work)
- Migrating the rest of the frontend off the Sanity starter tokens
- Newsletter submission, cookie consent — see [Deferred Work](#deferred-work)

## Design Reference

The footer is a single full-bleed section on `brand/Lowlands` with one decorative wave vector
spanning it, and three content bands stacked at `gap-2xl` (96px):

1. **Newsletter + info.** Left: a 346px column with an EB Garamond headline and the signup form.
   Right: an 841px three-column grid — CONTACT, ADDRESS, OFFICE HOURS — each a DM Mono tracked
   uppercase label above DM Sans 16px lines.
2. **Navigation.** A five-column grid (200px columns, 90px gutters) of DM Mono labels above DM Sans
   13px links at 75% opacity.
3. **Legal.** Copyright left; legal links and three social icons right, baseline-aligned.

### Measured values

Taken from the Figma node, for implementation reference:

| Element | Values |
| --- | --- |
| Footer root | bg `brand/Lowlands`, `px` 40 (`global-margin`), `py` 64 (`section-p-sm`), overflow clipped |
| Container | max 1440 total / 1360 content, `flex-col`, gap 96 (`gap-2xl`) |
| Wave vector | 4758×760, absolute, `top-0`, horizontally centered, decorative |
| Newsletter column | 346 wide, gap 24 (`gap-md`) |
| Headline | `font/family-primary` (EB Garamond) 32 (`headline-base`), line-height 1.3, `warm-neutral/50` |
| Input | bg `warm-neutral/50`, h 42, flex-1, `px` 12 / `py` 10, radius 4, DM Sans 13, text `brand/Lowlands` |
| Submit button | bg `brand/Goldenrod`, 42×42, radius 4, 24×24 arrow icon centered |
| Form row gap | 4 (`gap-mini`) |
| Info grid | 3 columns, 253.67 wide, 40 gutter (841 total) |
| Info lines | DM Sans 16 (`body-base`), line-height 1.6, gap 12 (`gap-sm`) |
| Column labels | DM Mono 14, letter-spacing 1.54px (11% of 14), uppercase, line-height 1.6 |
| Nav grid | 5 columns, 200 wide, 90 gutter (1360 total) |
| Nav links | DM Sans 13 (`body-small`), gap 4 (`gap-mini`), opacity 75% |
| Legal row | `justify-between`, `items-end`; links gap 24, social gap 12 |
| Social icons | 29×29 outer box each |

The Figma grids carry large `gap-y` values (90px, 337px) — auto-layout wrap artifacts on
single-row grids. Ignore them.

### Known design discrepancies

- The footer root background is a raw `#3e5936`, one shade off the `brand/Lowlands` token
  `#3d5934`. **Use the token.** The raw hex reads as a designer slip.
- No hover states are defined. Nav and legal links rest at 75% opacity; **hover goes to 100%.**
  Assumption — flag to the designer.
- The design is a desktop 1440 frame only. See [Responsive](#responsive).

## Sanity Schema

### `menuLink` and `menuGroup` objects

Two types rather than one, so a heading and a link are structurally distinct and there are no
ambiguous states (an item that has both a link and children, or neither).

**`menuLink`** — a leaf:

| Field | Type | Notes |
| --- | --- | --- |
| `label` | `string` | required |
| `link` | `link` | required; the existing `link` object |

Reusing the existing `objects/link.ts` gives URL / page reference / post reference and
`openInNewTab` for free, and keeps link authoring consistent with the rest of the Studio.

**`menuGroup`** — a non-linking heading with a submenu:

| Field | Type | Notes |
| --- | --- | --- |
| `label` | `string` | required |
| `children` | `array` of `menuLink` | required, min 1 |

Depth is capped at two levels (group → links). That is what the design needs, Sanity does not model
recursive object types cleanly, and deeper nesting would be speculative. Both types get `preview`
configs so the Studio array shows the label and, for groups, the child count.

### `menu` document

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | required — e.g. "Footer Menu", "Legal Menu" |
| `items` | `array` of `menuLink` \| `menuGroup` | ordered |

Standalone and referenced rather than inlined, so the header later references another `menu` with no
schema change. Preview shows title plus item count.

In the footer design the five column labels are `menuGroup`s; the legal menu is two bare
`menuLink`s.

### `footer` singleton

Document type `footer`, fixed id `footer`.

| Field | Type | Design source |
| --- | --- | --- |
| `newsletterHeading` | `string` | "Stay up to date on what is happening on the island." |
| `infoColumns` | `array` of `infoColumn` | CONTACT / ADDRESS / OFFICE HOURS |
| `footerMenu` | `reference` → `menu` | the five-column nav |
| `legalMenu` | `reference` → `menu` | Cookie Settings, Privacy Policy |
| `socialLinks` | `array` of `socialLink` | Facebook, Instagram, LinkedIn |
| `organizationName` | `string` | "Nantucket Islands Land Bank" |

**`infoColumn`** — `{ heading: string, lines: infoLine[] }`
**`infoLine`** — `{ text: string, href?: url }`

`infoColumns` is deliberately generic rather than typed `phone` / `fax` / `address` fields:

- The design bakes labels into the content ("Phone: 508-228-7240", "FAX: 508-228-9369")
- All three columns are visually identical
- The client can rename or add a column without a schema change

The optional `href` lets `info@nantucketlandbank.org` be a real `mailto:` and the phone a `tel:`
while "MA 02554" stays plain text — explicit, no auto-detection. It is a `url` field validated with
`Rule.uri({scheme: ['http', 'https', 'mailto', 'tel']})`, since the default `url` validation rejects
`mailto:` and `tel:`.

**`socialLink`** — `{ platform: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube', url }`

An array with a platform enum rather than fixed per-platform fields, so the organization can add or
drop a network without a schema change. The frontend maps platform → icon component and renders
nothing for a platform with no icon. Only the three in the design ship with icons.

**Copyright** is not a stored string. The frontend renders
`Copyright © {currentYear} {organizationName}`. This matches the design's "2026" and never goes
stale.

## Studio Structure

`studio/src/structure/index.ts` gains a top-level **Globals** list item, placed next to
`Site Settings` since both are global configuration:

```
Globals
├── Footer   (singleton, documentId 'footer')
└── Menus    (documentTypeList 'menu')
```

`Site Settings` stays where it is at top level. `footer` and `menu` are added to `DISABLED_TYPES` so
they do not also appear in the automatic root list.

## Frontend

### Tokens

Footer-scoped only, added to the `@theme` block in `frontend/css/globals.css`. Named after the Figma
variables so later work extends the same system rather than inventing a parallel one.

```css
--color-brand-lowlands: #3d5934;
--color-brand-goldenrod: #ecbb20;
--color-warm-neutral-50: #fdf9f4;

--text-body-small: 13px;
--text-body-base: 16px;
--text-headline-base: 32px;

--spacing-gap-mini: 4px;
--spacing-gap-sm: 12px;
--spacing-gap-md: 24px;
--spacing-gap-lg: 40px;
--spacing-gap-2xl: 96px;
--spacing-section-p-sm: 64px;
--spacing-global-margin: 40px;

--container-site: 1440px;

--font-primary: var(--font-eb-garamond), serif;
--font-secondary: var(--font-dm-sans), sans-serif;
--font-mono-tracked: var(--font-dm-mono), monospace;
```

Tokens the footer does not consume are left out — the full design system is a separate task.

### Fonts

**EB Garamond** (`font/family-primary`), **DM Sans** (`font/family-secondary`), and **DM Mono**
(the tracked uppercase labels) are added via `next/font/google` in `frontend/app/layout.tsx`, exposed
as CSS variables and wired into `@theme` as `--font-primary`, `--font-secondary`, `--font-mono-tracked`.

Inter and IBM Plex Mono are **left in place.** Removing them would break other pages and is outside
this scope.

### Components

| File | Responsibility |
| --- | --- |
| `components/Footer.tsx` | Server component: fetches the footer query, composes the three bands and the wave |
| `components/FooterMenu.tsx` | Renders a `menu`'s groups and links; groups become column headings |
| `components/NewsletterSignup.tsx` | Presentational form — no submit handler (deferred) |
| `components/SocialLinks.tsx` | Maps `platform` → icon component |
| `components/icons/` | Facebook, Instagram, LinkedIn from the exported Figma SVGs |

Each has one clear job: `FooterMenu` knows nothing about the footer's layout bands and is reusable
by the header; `Footer` knows nothing about how a menu item renders.

Links render through the existing `components/ResolvedLink.tsx`, which already resolves
URL / page / post via `linkResolver` and handles `openInNewTab`.

### Query

A new `footerQuery` in `frontend/sanity/lib/queries.ts` reads `*[_id == "footer"][0]`, dereferences
`footerMenu` and `legalMenu`, and resolves page/post slugs inside menu items using the existing
`linkReference` GROQ fragment. Types are regenerated with `npm run sanity:typegen`.

### Assets

Downloaded from Figma and committed — the Figma asset URLs expire in ~7 days, so hotlinking is not
an option:

| Asset | Destination |
| --- | --- |
| Wave background vector (4758×760) | `frontend/public/images/footer-wave.svg` |
| Arrow forward (24×24) | `frontend/components/icons/ArrowForwardIcon.tsx` |
| Facebook / Instagram / LinkedIn (29×29) | `frontend/components/icons/` |

Icons become inline React SVG components (they are single-path glyphs that must inherit
`currentColor`); the wave stays a static file in `public/` because it is a 4758px-wide multi-path
illustration with no color inheritance needs.

Per the Figma design-to-code guidance: render every icon from its exported asset, and preserve both
the outer box and the inner leaf geometry — the social icons are 29×29 boxes with inset glyphs, not
29×29 glyphs.

The wave is decorative: `aria-hidden`, `pointer-events-none`, absolutely positioned `top-0` and
horizontally centered behind the content. The footer clips overflow. At viewports wider than 1440 the
footer stretches while the wave stays 4758px centered, which still covers it.

### Targeted fix to existing code

`frontend/app/layout.tsx` has `py-24` on `<body>` — a Sanity starter leftover paired with the fixed
header. The footer is full-bleed edge-to-edge in the design, and body padding would inset it. Move
that padding from `<body>` to `<main>`.

## Responsive

The design is desktop-only, so the following are **assumptions to confirm with the designer**:

| Breakpoint | Nav columns | Info columns | Other |
| --- | --- | --- | --- |
| ≥1280 | 5 | 3 | As designed |
| ≥1024 | 3 | 3 | — |
| ≥640 | 2 | 2 | Signup column full width above info |
| <640 | 1 | 1 | Legal row stacks; social above copyright |

Horizontal padding drops from `global-margin` (40px) to 24px below 640. The wave vector stays
centered and clipped at every width.

## Error Handling

The footer must never break a page render:

- Missing `footer` document, or a null/unpublished menu reference → render the bands that do have
  content, skip the rest. No thrown errors.
- Menu item whose `link` resolves to `null` (`linkResolver` returns null for an incomplete link) →
  `ResolvedLink` already renders the children unwrapped. Acceptable.
- `socialLink` with an unrecognized platform → render nothing for that entry.
- Empty `infoColumns` or an empty `lines` array → omit the column.

Required-field validation in the schema (`label`, `title`, `menuGroup.children` min 1) prevents most
of this at authoring time; the frontend is defensive because references can be unpublished.

## Testing

The repo has no test infrastructure, so verification is manual and type-level:

1. `npm run sanity:typegen` — schema extracts and types generate cleanly
2. `npm run type-check` in `frontend` — no type errors
3. `npm run lint` in `frontend`
4. Studio: `Globals > Footer` and `Globals > Menus` present; `footer` and `menu` do not appear twice
   at the root; author the footer menu (5 groups) and legal menu (2 links) from the design content
5. Frontend: footer renders against real content; compare against the Figma screenshot at 1440;
   walk the breakpoints in the table above; confirm keyboard focus order and that the wave is not
   focusable or announced

## Deferred Work

Recorded here, not built:

1. **Newsletter submission.** The form is presentational — no handler, no action. Needs a provider
   decision (Mailchimp / Constant Contact / other), a server action, validation, and success/error
   states.
2. **Cookie Settings.** A consent-manager trigger, not a URL. It sits in the legal menu as a
   placeholder link until a consent manager is chosen.
3. **Mobile footer.** Designer confirmation of the breakpoint table above.
4. **Header menu.** Will reference the same `menu` documents. No schema change expected.
5. **`frontend/tailwind.config.ts` is vestigial** under Tailwind v4 — `globals.css` uses
   `@import 'tailwindcss'` with `@theme` and no `@config` directive, so the file is not loaded. Its
   `green` / `yellow` scales are unrelated to the brand palette and are a trap for the next person.
6. **Rest of the design system.** Only footer-consumed tokens are added here.
