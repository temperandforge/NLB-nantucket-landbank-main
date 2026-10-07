# Absorb nlb-design, Phase A (static blocks and shared UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `nlb-design`'s static components exist in this repo as Sanity-driven page-builder blocks and shared UI, with `nlb-design`'s visuals winning wherever they overlap the theme-ported blocks.

**Architecture:** Shared UI (`Tag`, `Button`, `LinkButton`, `IconButton`, a link row) and its CSS land first. Two new blocks (`missionStatement`, `ctaContact`) and four reworks (`basicLeftRightText`, `heroTertiary`, `heroImage`, `timeline`) then build on it. A new rich-text item, **anchor links**, gives the right column of `basicLeftRightText` its repeater of link rows with a link or download icon.

**Tech Stack:** Sanity Studio, Next.js 16 (read `node_modules/next/dist/docs/` before Next work), Tailwind v4, `next-sanity` Portable Text, `sanity-image`, `@splidejs/splide` (new), `sanity typegen`.

**Spec:** [docs/superpowers/specs/2026-10-07-absorb-nlb-design-design.md](../specs/2026-10-07-absorb-nlb-design-design.md). Source project: `/Users/jtf/Developer/nlb-design` (referred to below as `$ND`). Earlier plan for context: [slice 1](2026-10-07-wp-blocks-migration.md).

## Global Constraints

- Where `$ND` and a theme-ported block overlap, `$ND`'s visuals win. Do not consult the WordPress theme for those blocks.
- Never copy `$ND/node_modules`, `$ND/.next`, `$ND/.claude` or `$ND/.git`. `$ND` itself is never modified or deleted.
- Only singletons get explicit `_id`s. Relationships are `reference` fields. Derivable values are computed at render, never stored.
- Reuse the shared `link` object. No parallel link shape.
- Add design tokens per feature, named after their Figma variables. An existing token beats raw hex; flag any discrepancy in the commit message.
- Commit Figma assets (copied from `$ND/public`); never hotlink. Large artwork stays a file in `frontend/public/`; icons become inline SVG components using `currentColor`.
- Anything rendered must degrade, never throw. A link that does not resolve renders no link.
- Types derive from the generated query types (`ExtractPageBuilderType`). Never hand-write them.
- GROQ fragments are **constants**, never functions (a function call in a `defineQuery` template widens the type to `string`; see `docs/DECISIONS.md` 7.4).
- Enum-like strings read from Sanity are compared through `stegaClean(...)` (they carry invisible characters in Presentation).
- Never build a Tailwind class by string interpolation (`` `button-${variant}` ``). Every full class name must appear literally in source (`$ND/docs/006-figma-to-code-conventions.md`). Use lookup objects.
- Mobile base styles with desktop behind `md:` (768px).
- Every block is defined with `defineBlock` (adds the "Hide this block" setting), and is added to the sorted list in `studio/src/schemaTypes/documents/page.ts`.
- `frontend/sanity.types.ts`, `studio/sanity.types.ts` (if it changes) and `sanity.schema.json` are tracked artifacts: run `npm run sanity:typegen` in `frontend` after schema or query changes and commit the result.
- Verification gate for every task: `npm run sanity:typegen`, `npm run type-check`, `npm run lint`, `node scripts/verifyJumpNav.mts` in `frontend`; `npx tsc --noEmit` in `studio`. Run them as separate commands, each under the tool timeout.
- Do not leave a dev server running. Do not run network downloads (the shell refuses them); copy from `$ND` instead.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: Phase B (cards, `newsPreview`, `eventsPreview`, `faqList`, `peopleGrid`, `projectGrid` and their documents), `VideoBand`, `Footer`.

## Token and typography decisions

This repo's `tokens.css` and `$ND/css/tokens.css` come from the same Figma variables but differ in how they are expressed. The resolutions (apply them in every task):

| Topic | `$ND` | This repo | Resolution |
|---|---|---|---|
| Headline and display sizes | fluid `clamp` between 375px and 1440px | stepwise, switching at 768px | **Replace** this repo's stepwise `--text-display-*` and `--text-headline-*` with `$ND`'s fluid clamps, add `--text-headline-2xl`, drop the mobile override block, and define `text-headline-2xl/xl/lg/base` utilities (serif, -0.05em, 1.1) exactly as `$ND` does. No parallel utilities are added. |
| Slice 1 `text-h1..h6` | n/a | fluid, weight 500 | **Removed.** Their remaining users (`Hero`, `JumpNavContent`, `MapTeaser`, `ContactForm`) move to `text-headline-*` by visual size: h1 -> 2xl, h2 -> xl, h3 -> lg, h4 -> base, h5/h6 -> sm. |
| Footer's `text-headline-base` | n/a | stepwise size only | Now also gets the heading style (serif, -0.05em). Re-checked in Task 1; its look must not regress. |
| Section spacing `py-s1`..`s9` | fluid clamps | absent | Added to `@theme` in Task 1, with `rem` literals. |
| `tracking-wide` | `0.125rem` (2px) | `0.02em` | **Replace** with `0.125rem`. Tags and eyebrows use it. `tracking-tight` and `tracking-normal` are left alone (the base heading style uses `tracking-tight`). |
| `hover-darker` / `hover-lighter` | 8% / 70% translucent mixes | solid hexes | Do not touch the existing tokens. UI CSS uses its own `--ui-hover-darker` / `--ui-hover-lighter` mixes. Flag. |
| Semantic colours (`background`, `primary`, `surface-dark`, `on-*`, `tag`…) | same names | same names | Reused as is. |
| `tf-px` | `clamp(1.25rem … 2.25rem)` | `clamp(1.5rem … 2.9507rem)` (slice 1) | Keep this repo's. Flag. |
| Heading weight | 400 | 500 on `text-h*` | `text-headline-*` is 400, as in `$ND`. |

## Review Focus

Input classes the spec implies but a happy-path build does not exercise. Each is pinned by a named step.

1. **A link row, mission link or button whose link resolves to nothing** (empty page reference, unpublished page, blank URL) renders nothing, not a dead link or a labelled blank. Pinned in Tasks 3, 4, 7, 8 and the Task 10 gallery.
2. **A rich-text anchor-links item with zero links, or links with no label.** It renders nothing. Pinned in Task 3.
3. **A timeline with 0, 1 or 2 entries, or more than ten.** Fewer slides than the slider shows per page, and line lengths cycling past ten entries, must not break the dot math or throw. Pinned in Task 9.
4. **CTA and hero images missing** (no asset, or deleted): text and button still render, with no broken `<img>`. Pinned in Tasks 5, 6 and 8.
5. **Heading level set to H1/H2 in Presentation** (stega characters in the value). Pinned in Tasks 4 and 5 via `stegaClean`.

## File Structure

**Create (frontend):**
- `css/ui.css` — shared UI CSS ported from `$ND/css/components/*.css`, plus the heading utilities and section spacing
- `components/ui/{Tag,Button,ButtonLink,LinkButton,IconButton,LinkRow}.tsx`
- `components/blocks/{MissionStatement,CtaContact,TimelineSlider}.tsx`
- `public/images/blocks/` — line art copied from `$ND/public/svg`
- `docs/design/` (repo root `docs/`) — `$ND/docs` moved in

**Create (studio):** `objects/{anchorLinks,missionStatement,ctaContact}.ts`

**Modify:** `frontend/css/globals.css`, `frontend/css/tokens.css`, `frontend/css/blocks.css`, `frontend/components/NewsletterSignup.tsx` (only if its look regresses), `frontend/components/blocks/{Hero,JumpNavContent,MapTeaser,ContactForm}.tsx`, `frontend/components/icons/index.tsx`, `frontend/components/PortableText.tsx`, `frontend/components/BlockRenderer.tsx`, `frontend/components/blocks/{BasicLeftRightText,HeroTertiary,HeroImage,HeroSecondary,Timeline}.tsx`, `frontend/sanity/lib/queries.ts`, `studio/src/schemaTypes/objects/{blockContent.tsx,link.ts,basicLeftRightText.ts,heroTertiary.ts,timeline.ts}`, `studio/src/schemaTypes/{index.ts,documents/page.ts}`, `studio/scripts/seedBlockGallery.ts`, `docs/DECISIONS.md`, `frontend/package.json`.

**Delete:** `frontend/components/blocks/TimelineTrack.tsx`, `frontend/public/images/blocks/hero-tertiary-lines.svg` (unused after Task 5).

---

### Task 1: Shared UI CSS, typography replacement and spacing

**Files:**
- Create: `frontend/css/ui.css`
- Modify: `frontend/css/globals.css`, `frontend/css/tokens.css`, `frontend/components/blocks/{Eyebrow,Hero,JumpNavContent,MapTeaser,ContactForm}.tsx`
- Copy: line art from `$ND/public/svg` into `frontend/public/images/blocks/`

**Interfaces:**
- Produces utilities and classes used by every later task: `text-headline-2xl|xl|lg|base|sm`, `py-s1`..`py-s9` (and `pt-`, `pb-`, `p-`), `.button`, `.button-primary|secondary|ghost`, `.icon-button`, `.icon-button-primary|secondary|ghost`, `.link-button`, `.link-button-icon`, `.link-item--inactive`, `.link-item--hover`, `.tag-label`, `.history-slider-arrow`, `.basic-left-right__lines`, `.mission-statement__lines`. `tokens.css` now has fluid `--text-display-*` and `--text-headline-*` (plus `--text-headline-2xl`) and `--tracking-wide: 0.125rem`.
- Produces assets under `/images/blocks/`: `decorative-line-basic-left-right.svg`, `decorative-line-mission.svg`, `decorative-line-hero.svg`, `decorative-line-hero-tertiary.svg`, `decorative-line-cta-contact-1.svg`, `decorative-line-cta-contact-2.svg`, `decorative-line-cta-contact-mobile.svg`.

- [ ] **Step 1: Read the framework docs**

Read `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` (global CSS and Tailwind) and `.../12-images.md` (local SVG handling in `next/image`). Confirm a local `.svg` `src` is served unoptimized.

- [ ] **Step 2: Copy the line art**

```bash
ND=/Users/jtf/Developer/nlb-design/public/svg
DEST=frontend/public/images/blocks
for f in decorative-line-basic-left-right decorative-line-mission decorative-line-hero decorative-line-hero-tertiary decorative-line-cta-contact-1 decorative-line-cta-contact-2 decorative-line-cta-contact-mobile; do cp "$ND/$f.svg" "$DEST/$f.svg"; done
ls -la $DEST
```

Expected: seven new `.svg` files plus the slice 1 ones, all non-empty.

- [ ] **Step 3: Create `frontend/css/ui.css`**

```css
/**
 * Shared UI and block helpers ported from the nlb-design project (css/components/*.css and
 * css/tokens.css). Tokens stay in tokens.css; this file adds only what the ported components
 * need. Differences from nlb-design's tokens are listed in
 * docs/superpowers/plans/2026-10-07-absorb-nlb-design-phase-a.md.
 */

/* ---- Fluid section spacing, nlb-design --spacing-s1..s9 (375px -> 1440px) ------------------- */
@theme {
  --spacing-s1: clamp(1.25rem, calc(1.25rem + 1.25rem * ((100vw - 375px) / 1065px)), 2.5rem); /* Hero - Tertiary top */
  --spacing-s2: clamp(2rem, calc(2rem + 0.5rem * ((100vw - 375px) / 1065px)), 2.5rem); /* Hero - Secondary */
  --spacing-s3: clamp(2.5rem, calc(2.5rem + 1.5rem * ((100vw - 375px) / 1065px)), 4rem); /* Hero - Tertiary, interactive map */
  --spacing-s4: clamp(3rem, calc(3rem + 2rem * ((100vw - 375px) / 1065px)), 5rem);
  --spacing-s5: clamp(4rem, calc(4rem + 1rem * ((100vw - 375px) / 1065px)), 5rem); /* Image Carousel */
  --spacing-s6: clamp(4rem, calc(4rem + 2rem * ((100vw - 375px) / 1065px)), 6rem); /* Basic - Left Right Text */
  --spacing-s7: clamp(4rem, calc(4rem + 4rem * ((100vw - 375px) / 1065px)), 8rem);
  --spacing-s8: clamp(5rem, calc(5rem + 3rem * ((100vw - 375px) / 1065px)), 8rem);
  --spacing-s9: clamp(5rem, calc(5rem + 5rem * ((100vw - 375px) / 1065px)), 10rem); /* Home - Mission */
}

/* ---- Headline utilities (as in nlb-design). The fluid sizes live in tokens.css. -------------- */
@utility text-heading-base {
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

@utility text-headline-2xl {
  @apply text-heading-base;
  font-size: var(--text-headline-2xl);
}

@utility text-headline-xl {
  @apply text-heading-base;
  font-size: var(--text-headline-xl);
}

@utility text-headline-lg {
  @apply text-heading-base;
  font-size: var(--text-headline-lg);
}

@utility text-headline-base {
  @apply text-heading-base;
  font-size: var(--text-headline-base);
}

@utility text-headline-sm {
  @apply text-heading-base;
  font-size: var(--text-headline-sm);
}

/* ---- Hover overlays. tokens.css has solid hexes for hover-*; nlb-design uses translucent mixes. */
:root {
  --ui-hover-lighter: color-mix(in srgb, var(--color-dusty-heath-1000) 70%, transparent);
  --ui-hover-darker: color-mix(in srgb, var(--color-dusty-heath-200) 8%, transparent);
}

/* ---- Tag. Letter-spacing is --tracking-wide (2px), as in nlb-design. ------------------------- */
@utility tag-label {
  white-space: nowrap;
  overflow-wrap: break-word;
  font-family: var(--font-mono);
  font-size: var(--text-body-small);
  line-height: 1.6;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-on-tag);
}

/* ---- Button family (Figma Design System: Button 479-1169, Icon Button 522-463, Link Button 687-587) */
@utility button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) * 2);
  height: 3rem;
  padding-inline: calc(var(--spacing) * 5);
  overflow: clip;
  position: relative;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: var(--text-body-base);
  line-height: 1.6;
  letter-spacing: var(--tracking-normal);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@utility button-primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-darker), var(--ui-hover-darker));
  }
}

@utility button-secondary {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-lighter), var(--ui-hover-lighter));
  }
}

@utility button-ghost {
  background-color: transparent;
  color: var(--color-on-primary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-darker), var(--ui-hover-darker));
  }
}

@utility icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 4px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@utility icon-button-primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-darker), var(--ui-hover-darker));
    color: var(--color-accent-secondary);
  }
}

@utility icon-button-secondary {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-lighter), var(--ui-hover-lighter));
  }
}

@utility icon-button-ghost {
  background-color: transparent;
  color: var(--color-on-primary);

  &:hover:not(:disabled) {
    background-image: linear-gradient(var(--ui-hover-darker), var(--ui-hover-darker));
  }
}

@utility link-button {
  display: flex;
  align-items: center;
  height: 3rem;
  padding-inline: calc(var(--spacing) * 5);
  gap: calc(var(--spacing) * 2);
  overflow: clip;
  position: relative;
  font-family: var(--font-mono);
  font-size: var(--text-body-base);
  line-height: 1.6;
  letter-spacing: var(--tracking-normal);
  color: var(--color-on-primary);
  cursor: pointer;

  &:hover {
    gap: calc(var(--spacing) * 4);
  }

  &:hover .link-button-icon {
    color: var(--color-secondary);
  }
}

@utility link-button-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-on-primary);
  transition: color 150ms ease;
}

/* ---- Link item / link row (Figma Design System 114-258, 673-1914) ------------------------------ */
@utility link-item-base {
  display: flex;
  align-items: flex-end;
  gap: calc(var(--spacing) * 4);
  overflow: clip;
  border-radius: 4px;
  background-color: var(--color-surface-dark);
  padding-block: var(--spacing-gap-sm);
  padding-inline: var(--spacing-gap-md);

  & > span,
  & > p {
    flex: 1 0 0%;
    min-width: 1px;
    word-break: break-word;
    font-family: var(--font-mono);
    font-size: var(--text-body-base);
    line-height: 1.6;
    letter-spacing: var(--tracking-normal);
  }

  & > svg {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
  }
}

@utility link-item--inactive {
  @apply link-item-base;

  & > span,
  & > p {
    color: var(--color-on-background-subtle);
  }
}

@utility link-item--hover {
  @apply link-item-base;
  background: linear-gradient(0deg, var(--ui-hover-darker) 0%, var(--ui-hover-darker) 100%),
    var(--color-surface-dark);

  & > span,
  & > p {
    color: var(--color-on-surface-dark);
  }
}

/* ---- Timeline slider (ported from nlb-design history-slider.css) ------------------------------- */
.history-slider-arrow:focus-visible {
  outline: 2px solid var(--color-dusty-heath-300);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .history-slider .splide__list {
    transition-duration: 0s !important;
  }
}

/* ---- Decorative line art backgrounds ----------------------------------------------------------- */
.basic-left-right__lines {
  background: url('/images/blocks/decorative-line-basic-left-right.svg') center / cover no-repeat;
}

.mission-statement__lines {
  background: url('/images/blocks/decorative-line-mission.svg') center / cover no-repeat;
}
```

- [ ] **Step 4: Import it**

In `frontend/css/globals.css`, add `@import './ui.css';` after `@import './blocks.css';`.

- [ ] **Step 5: Replace the type sizes and tracking in `tokens.css`**

In `frontend/css/tokens.css`:

1. In the primitives `@theme`, change `--tracking-wide: 0.02em;` to `--tracking-wide: 0.125rem;` (Figma stores letter-spacing as a bare number; `$ND` reads it as 2px). Leave `--tracking-tight` and `--tracking-normal`.
2. Replace the whole "Type sizes (breakpoint collection)" `@theme` block **and** the `@media (width < 48rem) { :root { … } }` block after it with one fluid block (the mobile and desktop values are the same pairs the old stepwise tokens switched between):

```css
/* ---- Type sizes (breakpoint collection) ----------------------------------------------------
 * Fluid between the mobile (375px) and desktop (1440px) Figma values, as in nlb-design. Body
 * sizes are identical in both modes, so they stay fixed.
 */
@theme {
  --text-display-lg: clamp(var(--font-size-text-6xl), calc(var(--font-size-text-6xl) + (var(--font-size-text-7xl) - var(--font-size-text-6xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-7xl));
  --text-display-base: clamp(var(--font-size-text-5xl), calc(var(--font-size-text-5xl) + (var(--font-size-text-6xl) - var(--font-size-text-5xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-6xl));
  --text-display-sm: clamp(var(--font-size-text-4xl), calc(var(--font-size-text-4xl) + (var(--font-size-text-5xl) - var(--font-size-text-4xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-5xl));
  /* Not a real Figma token: the design for it is missing (see nlb-design's tokens.css). */
  --text-headline-2xl: clamp(2.6875rem, calc(2.6875rem + 2.3125rem * ((100vw - 375px) / 1065px)), 5rem);
  --text-headline-xl: clamp(var(--font-size-text-3xl), calc(var(--font-size-text-3xl) + (var(--font-size-text-4xl) - var(--font-size-text-3xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-4xl));
  --text-headline-lg: clamp(var(--font-size-text-2xl), calc(var(--font-size-text-2xl) + (var(--font-size-text-3xl) - var(--font-size-text-2xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-3xl));
  --text-headline-base: clamp(var(--font-size-text-xl), calc(var(--font-size-text-xl) + (var(--font-size-text-2xl) - var(--font-size-text-xl)) * ((100vw - 375px) / 1065px)), var(--font-size-text-2xl));
  --text-headline-sm: clamp(var(--font-size-text-lg), calc(var(--font-size-text-lg) + (var(--font-size-text-xl) - var(--font-size-text-lg)) * ((100vw - 375px) / 1065px)), var(--font-size-text-xl));
  --text-body-large: var(--font-size-text-lg);
  --text-body-base: var(--font-size-text-base);
  --text-body-small: var(--font-size-text-sm);
  --text-body-xs: var(--font-size-text-xs);
}
```

(Open `tokens.css` first and confirm the existing body lines match; keep any body token that differs from the above.)

- [ ] **Step 6: Move the slice 1 `text-h*` users to `text-headline-*`, and the eyebrow to 2px**

```bash
cd frontend/components/blocks
sed -i '' 's/text-h1/text-headline-2xl/g' Hero.tsx JumpNavContent.tsx
sed -i '' 's/text-h4/text-headline-base/g' MapTeaser.tsx ContactForm.tsx
sed -i '' 's/tracking-widest/tracking-wide/' Eyebrow.tsx
grep -n "text-h[1-6]\b" *.tsx
```

Expected: the grep prints only the files whose own task rewrites them (`BasicLeftRightText`, `HeroTertiary`, `HeroImage`, `HeroSecondary`'s none, `Timeline`, `TimelineTrack`); none of `Hero`, `JumpNavContent`, `MapTeaser`, `ContactForm`. The `text-h*` utilities are removed from `blocks.css` in Task 10, after the last user is gone.

- [ ] **Step 7: Verify the CSS compiles and the utilities exist**

```bash
cd frontend && NODE_ENV=production npx next build 2>&1 | tail -15
cd .next && python3 - <<'EOF'
import glob,re
css=''.join(open(f).read() for f in glob.glob('static/**/*.css',recursive=True))
for c in ['text-headline-2xl','text-headline-xl','text-headline-lg','text-headline-base','text-headline-sm','text-heading-base','tag-label','link-item--inactive','link-item--hover','link-button','button-primary','icon-button-ghost']:
    print(f"{c:24}", "OK" if re.search(r'\.'+re.escape(c)+r'(?![\w-])',css) else "not emitted (expected until a component uses it)")
EOF
```

Expected: build succeeds. Some utilities are not emitted until a component uses them; the build succeeding (no CSS errors) is the check here. Re-run this scan at Task 2's end.

- [ ] **Step 8: Gate and commit**

Run the gate commands from Global Constraints (separately). Then:

```bash
git add frontend/css frontend/components/blocks frontend/public/images/blocks
git commit -m "feat: replace headline sizes and tracking with nlb-design's, add shared UI CSS

Headline and display sizes are now fluid and text-headline-* carry the heading
style; the footer's text-headline-base picks up the serif heading style and
should be checked against the design. Hover overlays use local mixes.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared UI components and icons

**Files:**
- Create: `frontend/components/ui/Tag.tsx`, `Button.tsx`, `ButtonLink.tsx`, `LinkButton.tsx`, `IconButton.tsx`, `LinkRow.tsx`
- Modify: `frontend/components/icons/index.tsx`

**Interfaces:**
- Consumes: Task 1 classes.
- Produces icons: `ArrowRightIcon({className})`, `ArrowLeftIcon({className})`, `DownloadIcon({className})` (all `currentColor`, `aria-hidden`).
- Produces `Tag({label, size?: 'sm'|'lg', rounded?: boolean, className?})`.
- Produces `Button({children, variant?: 'primary'|'secondary'|'ghost', leftIcon?, rightIcon?, disabled?, type?, onClick?, className?})`.
- Produces `ButtonLink({label, href, variant?: 'primary'|'secondary'|'ghost', newTab?, className?})`: a link styled as a button (an `<a class="button …">`, no asterisk icons, as `nlb-design`'s CTA uses it).
- Produces `LinkButton({label, href, iconLeft?, iconRight?, className?})` (renders `<a>`).
- Produces `IconButton({children, label, variant?, disabled?, type?, onClick?, className?})`.
- Produces `LinkRow({label, href, icon: 'link' | 'download', className?})` (renders `<a>`; `download` attribute when icon is `download`).

- [ ] **Step 1: Add the icons**

Append to `frontend/components/icons/index.tsx` (paths come from `$ND/public/svg/icon-arrow-right.svg` and `icon-download.svg`; the stroke becomes `currentColor`):

```tsx
/** Arrow pointing right. Figma: Icon / Arrow right. 24 x 24. */
export function ArrowRightIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M5 12H19M12 19L19 12L12 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Arrow pointing left: the right arrow's own geometry, mirrored. */
export function ArrowLeftIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M19 12H5M12 19L5 12L12 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Download tray with arrow. Figma: Icon / Download. 24 x 24. */
export function DownloadIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 10L12 15L7 10M12 15V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Create the UI components**

`frontend/components/ui/Tag.tsx`:

```tsx
type TagProps = {
  label: string
  size?: 'sm' | 'lg'
  rounded?: boolean
  className?: string
}

export default function Tag({label, size = 'sm', rounded = true, className}: TagProps) {
  return (
    <div
      className={`flex items-center justify-center bg-tag ${
        size === 'lg' ? 'px-6 py-3' : 'px-2 py-1'
      } ${rounded ? 'rounded' : ''} ${className ?? ''}`}
    >
      <span className="tag-label">{label}</span>
    </div>
  )
}
```

`frontend/components/ui/Button.tsx` (the asterisk icons are the design's own; they are inline SVG, as in `$ND`):

```tsx
type ButtonProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  leftIcon?: boolean
  rightIcon?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  className?: string
}

// Full class names as literals, so Tailwind's scanner sees them.
const VARIANT_CLASSES = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
} as const

function Asterisk() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" aria-hidden="true">
      <path
        d="M12 6V18M17.196 9L6.804 15M6.804 9L17.196 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Button({
  children,
  variant = 'primary',
  leftIcon = true,
  rightIcon = true,
  disabled = false,
  type = 'button',
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {leftIcon && <Asterisk />}
      <span>{children}</span>
      {rightIcon && <Asterisk />}
    </button>
  )
}
```

`frontend/components/ui/ButtonLink.tsx`:

```tsx
type ButtonLinkProps = {
  label: string
  href: string
  variant?: 'primary' | 'secondary' | 'ghost'
  newTab?: boolean
  className?: string
}

// Full class names as literals, so Tailwind's scanner sees them.
const VARIANT_CLASSES = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
} as const

export default function ButtonLink({
  label,
  href,
  variant = 'primary',
  newTab = false,
  className,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {label}
    </a>
  )
}
```

`frontend/components/ui/LinkButton.tsx`:

```tsx
import {ArrowLeftIcon, ArrowRightIcon} from '@/components/icons'

type LinkButtonProps = {
  label: string
  href: string
  iconLeft?: boolean
  iconRight?: boolean
  className?: string
}

export default function LinkButton({
  label,
  href,
  iconLeft = false,
  iconRight = true,
  className,
}: LinkButtonProps) {
  return (
    <a href={href} className={`link-button ${className ?? ''}`}>
      {iconLeft && <ArrowLeftIcon className="link-button-icon" />}
      <span>{label}</span>
      {iconRight && <ArrowRightIcon className="link-button-icon" />}
    </a>
  )
}
```

`frontend/components/ui/IconButton.tsx`:

```tsx
type IconButtonProps = {
  children: React.ReactNode
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  className?: string
}

const VARIANT_CLASSES = {
  primary: 'icon-button-primary',
  secondary: 'icon-button-secondary',
  ghost: 'icon-button-ghost',
} as const

export default function IconButton({
  children,
  label,
  variant = 'primary',
  disabled = false,
  type = 'button',
  onClick,
  className,
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`icon-button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
```

`frontend/components/ui/LinkRow.tsx` (the design's "link item": a surface-dark row, mono label, 24px icon):

```tsx
import {ArrowRightIcon, DownloadIcon} from '@/components/icons'

type LinkRowProps = {
  label: string
  href: string
  /** Link shows an arrow; download shows the download tray and marks the link as a download. */
  icon: 'link' | 'download'
  newTab?: boolean
  className?: string
}

export default function LinkRow({label, href, icon, newTab = false, className}: LinkRowProps) {
  return (
    <a
      href={href}
      download={icon === 'download' ? '' : undefined}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`link-item--inactive hover:link-item--hover transition-colors ${className ?? ''}`}
    >
      <span>{label}</span>
      {icon === 'download' ? <DownloadIcon /> : <ArrowRightIcon />}
    </a>
  )
}
```

- [ ] **Step 3: Verify**

Run the gate commands (separately). Then re-run the CSS scan from Task 1 Step 5 against a fresh `NODE_ENV=production npx next build`; the classes are only emitted once a component uses them, so expect `button-*`, `icon-button-*`, `link-button`, `link-item--*` and `tag-label` still absent until blocks use them (Tasks 3, 7). That is acceptable; a type-check/lint pass is this task's check.

- [ ] **Step 4: Commit**

```bash
git add frontend/components
git commit -m "feat: add shared UI components and icons ported from nlb-design

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Anchor links in rich text

**Files:**
- Create: `studio/src/schemaTypes/objects/anchorLinks.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `objects/blockContent.tsx`, `objects/link.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/PortableText.tsx`

**Interfaces:**
- Consumes: `LinkRow` (Task 2), `linkResolver` from `@/sanity/lib/utils`, `DereferencedLink` from `@/sanity/lib/types`, `linkFields` and `markDefsFields` constants in `queries.ts`.
- Produces: Portable Text item `anchorLinks` with `links[]: {_key, label, link, icon: 'link' | 'download'}`; `CustomPortableText` renders it. A `rich-text-basic` styling hook is added in Task 4, not here.

- [ ] **Step 1: Fix the shared link's initial value**

In `studio/src/schemaTypes/objects/link.ts`, the `linkType` field has `initialValue: 'url'`, which is not one of its radio options (`'href'`, `'page'`), so a new link opens with nothing selected and its URL field hidden. Change it to `'href'`.

- [ ] **Step 2: Schema**

`studio/src/schemaTypes/objects/anchorLinks.ts`:

```ts
import {LinkIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A stack of link rows inside rich text: each row is a label, a link and an icon. Link shows an
 * arrow; Download shows the download tray (point the link at the file). Figma: Design System
 * "Link item". Rows are 16px apart.
 */
export const anchorLinks = defineType({
  name: 'anchorLinks',
  title: 'Anchor links',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'anchorLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: [
                  {title: 'Link (arrow)', value: 'link'},
                  {title: 'Download', value: 'download'},
                ],
                layout: 'radio',
              },
              initialValue: 'link',
            }),
          ],
          preview: {
            select: {title: 'label', icon: 'icon'},
            prepare: ({title, icon}) => ({
              title: title || 'Untitled',
              subtitle: icon === 'download' ? 'Download' : 'Link',
            }),
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {links: 'links'},
    prepare: ({links}) => ({
      title: 'Anchor links',
      subtitle: `${links?.length ?? 0} links`,
    }),
  },
})
```

Register `anchorLinks` in `studio/src/schemaTypes/index.ts` (import and add to the array, near `link`). In `objects/blockContent.tsx` add `defineArrayMember({type: 'anchorLinks'}),` to the array's `of` list, after the image member.

- [ ] **Step 3: Query projection**

In `frontend/sanity/lib/queries.ts`, change the `basicLeftRightText` branch so `rightContent` resolves the links inside anchor links. Replace its `body[]{...}` and `rightContent[]{...}` parts with:

```ts
    _type == "basicLeftRightText" => {
      ...,
      rightContent[]{
        ...,
        _type == "anchorLinks" => {
          links[]{
            ...,
            ${linkFields}
          }
        },
        ${markDefsFields}
      }
    },
```

(`body` and `button` are removed in Task 4; remove `button{...}` and `body[]{...}` from this branch now, since Task 4 deletes those fields and the query must not reference them after typegen.)

- [ ] **Step 4: Typegen**

Run: `cd frontend && npm run sanity:typegen`
Expected: success; `sanity.types.ts` contains `AnchorLinks`.

- [ ] **Step 5: Renderer**

In `frontend/components/PortableText.tsx`:

```tsx
import LinkRow from '@/components/ui/LinkRow'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'
```

and add to `components.types` (beside `image`):

```tsx
      anchorLinks: ({value}) => {
        type Row = {_key: string; label?: string; icon?: 'link' | 'download'; link?: DereferencedLink}
        const rows = ((value?.links ?? []) as Row[]).flatMap((row) => {
          // A row needs a label and a link that resolves; anything else would be a dead row.
          const href = row.link ? linkResolver(row.link) : null
          return row.label && href
            ? [{key: row._key, label: row.label, href, icon: stegaClean(row.icon) === 'download' ? ('download' as const) : ('link' as const), newTab: Boolean(row.link?.openInNewTab)}]
            : []
        })
        if (rows.length === 0) return null
        return (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <LinkRow key={row.key} label={row.label} href={row.href} icon={row.icon} newTab={row.newTab} />
            ))}
          </div>
        )
      },
```

Import `stegaClean` from `next-sanity` (add to the existing `next-sanity` import).

- [ ] **Step 6: Verify and commit**

Run the gate commands (separately). Expected: all exit 0. Then:

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add anchor links to rich text (link rows with link or download icon)

Also fixes the shared link's initial value, which was not one of its options.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Rework Basic - Left Right Text

**Files:**
- Modify: `studio/src/schemaTypes/objects/basicLeftRightText.ts`, `frontend/components/blocks/BasicLeftRightText.tsx`, `frontend/components/PortableText.tsx`, `frontend/css/ui.css`
- Copy: nothing new (the line art was copied in Task 1)

**Interfaces:**
- Consumes: Task 1 (`py-s6`, `text-headline-lg`, `.basic-left-right__lines`), Task 3 (`anchorLinks`).
- Consumes: `ButtonLink` (Task 2).
- Produces: block `basicLeftRightText` with fields `eyebrow`, `heading`, `headingLevel`, `buttons[]: {_key, label, link, variant}` (on the left, under the heading) and `rightContent` (rich text). The theme's `body` and `button` are removed. `CustomPortableText` gains an optional `variant?: 'prose' | 'basic'` prop (default `'prose'`).

- [ ] **Step 1: Schema**

Replace the `fields` in `basicLeftRightText.ts` with the following, and add `defineArrayMember` to its `sanity` import:

```ts
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h2'),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      description: 'Shown on the left, under the heading. Optional.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'blockButton',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
            defineField({
              name: 'variant',
              title: 'Style',
              type: 'string',
              options: {
                list: [
                  {title: 'Primary', value: 'primary'},
                  {title: 'Secondary (gold)', value: 'secondary'},
                  {title: 'Ghost', value: 'ghost'},
                ],
                layout: 'radio',
              },
              initialValue: 'primary',
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'variant'}},
        }),
      ],
    }),
    defineField({
      name: 'rightContent',
      title: 'Right column',
      type: 'blockContent',
      description:
        'Section headings (Heading 3), paragraphs, and anchor links for downloads or related pages.',
    }),
  ],
```

Update the doc comment above the type: the left column is eyebrow, heading and optional buttons; the right column is rich text with anchor links; the theme's left-column text and single button no longer exist. The button style is not specified in the Figma links given, so the variants are the design system's three button styles, defaulting to Primary: an assumption for the user to confirm.

Also add the buttons to the `basicLeftRightText` branch of `pageBuilderFields` in `frontend/sanity/lib/queries.ts`, before `rightContent[]{`:

```ts
      buttons[]{
        ...,
        ${linkFields}
      },
```

- [ ] **Step 2: A proseless rich-text variant**

In `PortableText.tsx` add `variant?: 'prose' | 'basic'` to the props (default `'prose'`). Wrap with the existing `prose ...` classes only for `'prose'`; for `'basic'` use `<div className={`rich-text-basic ${className ?? ''}`}>`. Add to `frontend/css/ui.css`:

```css
/* Rich text in Basic - Left Right Text (nlb-design BasicLeftRight): sections 64px apart, a
   heading 24px above its text, link rows 16px apart (set on the anchor-links wrapper). */
.rich-text-basic {
  color: var(--color-on-background);
  font-family: var(--font-sans);
  font-size: var(--text-body-base);
  line-height: 1.6;
}

.rich-text-basic > * + * {
  margin-top: 1.5rem;
}

.rich-text-basic > h3,
.rich-text-basic > h4,
.rich-text-basic > h5,
.rich-text-basic > h6 {
  margin-top: 4rem;
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.rich-text-basic > h3 {
  font-size: var(--text-headline-lg);
}

.rich-text-basic > h4 {
  font-size: var(--text-headline-base);
}

.rich-text-basic > h5,
.rich-text-basic > h6 {
  font-size: var(--text-headline-sm);
}

.rich-text-basic > :first-child {
  margin-top: 0;
}

.rich-text-basic > div:has(> a.link-item--inactive) {
  margin-top: 4rem;
}

.rich-text-basic a:not(.link-item--inactive) {
  text-decoration: underline;
}

.rich-text-basic ul,
.rich-text-basic ol {
  padding-left: 1.5rem;
}

.rich-text-basic ul {
  list-style: disc;
}

.rich-text-basic ol {
  list-style: decimal;
}
```

(The H3 renderer in `PortableText.tsx` already emits a plain `<h3>`, so these rules style it. Do not add Tailwind sizing classes to the renderers.)

- [ ] **Step 3: Component**

Replace `frontend/components/blocks/BasicLeftRightText.tsx` with (port of `$ND/components/BasicLeftRight.tsx`):

```tsx
import {stegaClean, type PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const

export default function BasicLeftRightText({block}: BlockProps<'basicLeftRightText'>) {
  // stegaClean: in Presentation the value carries invisible characters.
  const Heading = stegaClean(block.headingLevel) === 'h1' ? 'h1' : 'h2'
  // A button needs a label and a link that resolves; anything else would be a dead button.
  const buttons = (block.buttons ?? []).flatMap((button) => {
    const href = button.link ? linkResolver(button.link as DereferencedLink) : null
    if (!button.label || !href) return []
    const chosen = stegaClean(button.variant)
    const variant = BUTTON_VARIANTS.find((v) => v === chosen) ?? 'primary'
    return [{key: button._key, label: button.label, href, variant, newTab: Boolean(button.link?.openInNewTab)}]
  })

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s6">
      <div className="basic-left-right__lines pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex w-full flex-col gap-20 tf-max-w md:flex-row md:items-start">
        <div className="flex w-full flex-col items-start gap-10 md:flex-1">
          {block.eyebrow && <Eyebrow className="text-on-background">{block.eyebrow}</Eyebrow>}
          {block.heading && (
            <Heading className="w-full text-headline-xl text-on-background text-balance">{block.heading}</Heading>
          )}
          {buttons.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {buttons.map((button) => (
                <ButtonLink
                  key={button.key}
                  label={button.label}
                  href={button.href}
                  variant={button.variant}
                  newTab={button.newTab}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-start md:flex-1">
          {block.rightContent && (
            <CustomPortableText variant="basic" value={block.rightContent as PortableTextBlock[]} />
          )}
        </div>
      </div>
    </section>
  )
}
```

Note: `tf-max-w` is defined in `blocks.css` (slice 1) as `max-w-[90rem] mx-auto`; `$ND` also sets `w-full`, which the `w-full` above provides.

- [ ] **Step 4: Typegen and gate**

Run: `cd frontend && npm run sanity:typegen`, then the gate commands (separately). Expected: success. If `block.button` or `block.body` is referenced anywhere else (grep), remove it.

- [ ] **Step 5: Commit**

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: rework basic left-right text to the nlb-design layout

The left column is eyebrow and heading only; the right column is rich text
with anchor links. The theme's left-column text and button are removed.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rework Hero - Tertiary

**Files:**
- Modify: `studio/src/schemaTypes/objects/heroTertiary.ts`, `frontend/components/blocks/HeroTertiary.tsx`, `frontend/css/blocks.css`
- Delete: `frontend/public/images/blocks/hero-tertiary-lines.svg`

**Interfaces:**
- Consumes: `decorative-line-hero-tertiary.svg` (Task 1), `text-headline-2xl`, `py-s3`.
- Produces: block `heroTertiary` with fields `eyebrow`, `heading`, `headingLevel` (h1 default, h2 for the `SectionIntro` use), `body`.

- [ ] **Step 1: Schema**

In `heroTertiary.ts`, import `headingLevelField` and add `headingLevelField('h1')` after the heading field. Keep `eyebrow`, `heading`, `body`. Update the comment: Hero - Tertiary with an H2 option replaces nlb-design's Section Intro.

- [ ] **Step 2: Component**

Replace `HeroTertiary.tsx` (port of `$ND/components/HeroTertiary.tsx` and, via the heading level, `SectionIntro`):

```tsx
import Image from 'next/image'
import {stegaClean} from 'next-sanity'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroTertiary({block}: BlockProps<'heroTertiary'>) {
  // stegaClean: in Presentation the value carries invisible characters.
  const Heading = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s3">
      <div className="relative flex w-full flex-wrap items-start justify-between gap-10 tf-max-w">
        <Image
          src="/images/blocks/decorative-line-hero-tertiary.svg"
          alt=""
          aria-hidden="true"
          width={6072}
          height={4934}
          className="pointer-events-none absolute top-1/2 left-0 z-0 w-[104vw]! max-w-none -translate-y-[49%]"
        />
        <div className="relative z-10 flex max-w-[34.5rem] flex-col items-start gap-6 text-on-background">
          {block.eyebrow && <Eyebrow className="whitespace-nowrap">{block.eyebrow}</Eyebrow>}
          {block.heading && <Heading className="text-headline-2xl leading-[1.05]">{block.heading}</Heading>}
        </div>
        {block.body && (
          <p className="relative z-10 max-w-[42rem] pt-0 font-sans text-body-base leading-[1.6] text-on-background md:pt-[2.875rem]">
            {block.body}
          </p>
        )}
      </div>
    </section>
  )
}
```

Delete the now-unused `.hero-tertiary__lines` rule from `frontend/css/blocks.css` and the file `public/images/blocks/hero-tertiary-lines.svg` (`git rm`). Note `$ND`'s `section-full` helper is not needed: this section already spans the page.

- [ ] **Step 3: Typegen, gate, commit**

Run `cd frontend && npm run sanity:typegen`, then the gate commands (separately).

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: rework hero tertiary to the nlb-design layout, with an H2 option

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rework Hero - Image, and the light-brown Hero - Secondary art

**Files:**
- Modify: `frontend/components/blocks/HeroImage.tsx`, `frontend/components/blocks/HeroSecondary.tsx`, `frontend/css/blocks.css`
- Delete from `blocks.css`: the `.hero-image__lines` rule

**Interfaces:**
- Consumes: `decorative-line-hero.svg` (Task 1), `text-headline-xl`, `py-s3`, `BlockImage`.
- Produces: `heroImage` styled as `$ND`'s `HeroQuaternary`; `.hero-secondary__lines--light-brown` now uses `decorative-line-hero.svg`.

- [ ] **Step 1: Component**

Replace `HeroImage.tsx` (port of `$ND/components/HeroQuaternary.tsx`; the schema is unchanged):

```tsx
import Image from 'next/image'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroImage({block}: BlockProps<'heroImage'>) {
  return (
    <div className="relative flex w-full overflow-clip tf-px pt-s3 pb-s9">
      <BlockImage
        image={block.image}
        width={1920}
        sizes="100vw"
        fill
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="relative z-10 tf-max-w">
        <div className="relative flex h-[380px] w-full flex-col items-start justify-between overflow-clip rounded bg-background p-5 sm:w-[680px] sm:p-10">
          <Image
            src="/images/blocks/decorative-line-hero.svg"
            alt=""
            aria-hidden="true"
            fill
            className="pointer-events-none absolute inset-y-[-30%] inset-x-[-60%] z-0 size-auto object-contain opacity-60"
          />
          {block.eyebrow && (
            <Eyebrow className="relative z-10 text-on-background">{block.eyebrow}</Eyebrow>
          )}
          {block.heading && (
            <p className="relative z-10 w-full text-headline-xl text-on-background [text-wrap:pretty]">
              {block.heading}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

Heading semantics: `$ND` renders the title as a `<p>`. A page's main heading should be a heading, so render it as `<h1>` with the same classes (replace `<p className="relative z-10 w-full text-headline-xl …">` and its closing tag with `h1`); record this as a ruling in the ledger.

- [ ] **Step 2: Hero - Secondary's light-brown art**

In `frontend/css/blocks.css` change the `.hero-secondary__lines--light-brown` rule's image to `/images/blocks/decorative-line-hero.svg` (the tan line art used on `$ND`'s light card; it is the closest local match to the Figma "Page Header 3" vector) and keep `opacity: 0.6`. Remove the `.hero-image__lines` rule.

- [ ] **Step 3: Gate, commit**

Run the gate commands (separately).

```bash
git add -A frontend
git commit -m "feat: rework hero image to the nlb-design layout; light-brown hero secondary uses its line art

The light-brown Hero - Secondary art is a best local match for the Figma
vector, to be confirmed against the design by the user.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Mission Statement block

**Files:**
- Create: `studio/src/schemaTypes/objects/missionStatement.ts`, `frontend/components/blocks/MissionStatement.tsx`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/schemaTypes/documents/page.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/BlockRenderer.tsx`

**Interfaces:**
- Consumes: `Tag`, `LinkButton` (Task 2), `linkResolver`, `DereferencedLink`, `linkFields`, `defineBlock`, `eyebrowField`.
- Produces: block `missionStatement` with `eyebrow` (initial "Our mission"), `heading` (required), `links[]: {_key, label, link}`.

- [ ] **Step 1: Schema**

`studio/src/schemaTypes/objects/missionStatement.ts`:

```ts
import {BlockContentIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** A tag, a large centred statement and a row of link buttons over line art. Figma: Mission Block. */
export const missionStatement = defineBlock({
  name: 'missionStatement',
  title: 'Mission Statement',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Tag',
      type: 'string',
      initialValue: 'Our mission',
    }),
    defineField({
      name: 'heading',
      title: 'Statement',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'missionLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
          ],
          preview: {select: {title: 'label'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Mission Statement'}),
  },
})
```

Register in `index.ts`; in `page.ts` import it and add it to the `pageBuilderBlocks` array (the list sorts itself).

- [ ] **Step 2: Query branch**

In `pageBuilderFields` add:

```ts
    _type == "missionStatement" => {
      ...,
      links[]{
        ...,
        ${linkFields}
      }
    },
```

- [ ] **Step 3: Typegen**

`cd frontend && npm run sanity:typegen`

- [ ] **Step 4: Component** (port of `$ND/components/MissionStatement.tsx`)

`frontend/components/blocks/MissionStatement.tsx`:

```tsx
import LinkButton from '@/components/ui/LinkButton'
import Tag from '@/components/ui/Tag'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import {BlockProps} from './types'

export default function MissionStatement({block}: BlockProps<'missionStatement'>) {
  // A link that does not resolve (empty page reference, unpublished page, blank URL) is dropped
  // rather than rendered as a dead button.
  const links = (block.links ?? []).flatMap((item) => {
    const href = item.link ? linkResolver(item.link as DereferencedLink) : null
    return item.label && href ? [{key: item._key, label: item.label, href}] : []
  })

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s9">
      <div className="mission-statement__lines pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex w-full flex-col items-center justify-center tf-max-w">
        <div className="flex w-full max-w-[62.375rem] flex-col items-center gap-16 md:gap-20">
          {block.eyebrow && <Tag label={block.eyebrow} />}
          {block.heading && (
            <h2 className="w-full text-center text-headline-xl text-on-background text-pretty">
              {block.heading}
            </h2>
          )}
          {links.length > 0 && (
            <div className="flex flex-col items-center gap-6 md:flex-row md:flex-wrap md:justify-center md:gap-20">
              {links.map((link) => (
                <LinkButton key={link.key} label={link.label} href={link.href} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
```

The heading is an H2 as in `$ND`. Register `missionStatement: MissionStatement` in `BlockRenderer.tsx` (import path `@/components/blocks/MissionStatement`).

- [ ] **Step 5: Gate, commit**

Run the gate commands (separately).

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add mission statement block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: CTA Contact block

**Files:**
- Create: `studio/src/schemaTypes/objects/ctaContact.ts`, `frontend/components/blocks/CtaContact.tsx`
- Modify: `index.ts`, `page.ts`, `queries.ts`, `BlockRenderer.tsx`

**Interfaces:**
- Consumes: `BlockImage`, `linkResolver`, `.button .button-secondary` (Task 1), `defineBlock`.
- Produces: block `ctaContact` with `heading` (initial "Contact Us"), `body`, `button: {buttonText, link}` (shared `button` type), `desktopImage`, `mobileImage` (plain images, decorative, no alt).

- [ ] **Step 1: Schema**

`ctaContact.ts`:

```ts
import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A centred call to action over a photo and line art. The photos are decorative, so they have no
 * alt text field and are rendered with empty alt.
 */
export const ctaContact = defineBlock({
  name: 'ctaContact',
  title: 'CTA Contact',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Contact Us'}),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'text',
      rows: 3,
      initialValue:
        'Have a question, need more information, or not sure where to start? Reach out—we’re here to help connect you with the answers and resources you need.',
    }),
    defineField({name: 'button', title: 'Button', type: 'button'}),
    defineField({
      name: 'desktopImage',
      title: 'Background image (desktop)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'mobileImage',
      title: 'Background image (mobile)',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'heading', media: 'desktopImage'},
    prepare: ({title, media}) => ({title: title || 'Untitled', subtitle: 'CTA Contact', media}),
  },
})
```

Register in `index.ts` and `page.ts`. Query branch:

```ts
    _type == "ctaContact" => {
      ...,
      button{
        ...,
        ${linkFields}
      }
    },
```

- [ ] **Step 2: Typegen**, then component (port of `$ND/components/CtaContact.tsx`):

`CtaContact.tsx`:

```tsx
import Image from 'next/image'

import ResolvedLink from '@/components/ResolvedLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

export default function CtaContact({block}: BlockProps<'ctaContact'>) {
  const link = block.button?.link as DereferencedLink | undefined
  const showButton = Boolean(block.button?.buttonText && link && linkResolver(link))

  return (
    <section className="relative flex w-full items-center justify-center bg-background p-5 md:p-10">
      <div className="tf-max-w">
        <div className="relative h-[33.75rem] w-full overflow-clip md:h-[38.125rem]">
          <BlockImage
            image={block.mobileImage}
            width={750}
            sizes="100vw"
            fill
            className="absolute inset-0 z-0 size-full object-cover object-center md:hidden"
          />
          <BlockImage
            image={block.desktopImage}
            width={1440}
            sizes="(min-width: 768px) 1440px, 0px"
            fill
            className="hidden object-cover object-center md:absolute md:inset-0 md:z-0 md:block md:size-full"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-mobile.svg"
            alt=""
            aria-hidden="true"
            fill
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center md:hidden"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-1.svg"
            alt=""
            aria-hidden="true"
            width={1703}
            height={248}
            className="pointer-events-none absolute top-[3.4%] left-[calc(50%-14.5rem)] z-0 hidden w-[177%] max-w-none -translate-x-1/2 md:block"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-2.svg"
            alt=""
            aria-hidden="true"
            width={1523}
            height={238}
            className="pointer-events-none absolute top-[1.5%] left-1/2 z-0 hidden w-[159%] max-w-none -translate-x-1/2 md:block"
          />

          <div className="relative z-10 flex size-full flex-col items-center justify-center gap-8 px-5 text-center md:mx-auto md:w-[30.4375rem] md:gap-10 md:px-0">
            {block.heading && <h2 className="w-full text-headline-xl text-on-background text-pretty">{block.heading}</h2>}
            {block.body && (
              <p className="w-full font-sans text-body-base leading-[1.6] text-on-background">{block.body}</p>
            )}
            {showButton && link && (
              <ResolvedLink link={link} className="button button-secondary">
                {block.button?.buttonText}
              </ResolvedLink>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

`BlockImage`'s `ImageValue` type is derived from `hero.image`; the CTA images are plain images with no `alt`. Widen `BlockImage`'s prop so both fit: `image?: ImageValue | null` where `ImageValue` is `{asset?: {_ref?: string} | null; hotspot?: …; crop?: …; alt?: string | null}`. Use the generated type of `ctaContact.desktopImage` in a union: `ImageValue | NonNullable<ExtractPageBuilderType<'ctaContact'>['desktopImage']>`. Register `ctaContact: CtaContact` in `BlockRenderer.tsx`.

- [ ] **Step 3: Gate, commit**

Run the gate commands (separately).

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add CTA contact block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Rework Timeline as a slider

**Files:**
- Create: `frontend/components/blocks/TimelineSlider.tsx`
- Modify: `frontend/components/blocks/Timeline.tsx`, `frontend/package.json` (+ lockfile)
- Delete: `frontend/components/blocks/TimelineTrack.tsx`

**Interfaces:**
- Consumes: `.history-slider*` CSS and `text-headline-2xl` (Task 1).
- Produces: `TimelineSlider({events, className?})` where `events: TimelineEvent[]`, `TimelineEvent = {year: string; title: string; description: string; lineLength: number}`. `Timeline` maps `entries` to events, deriving `lineLength` per index (never stored).

- [ ] **Step 1: Add the dependency**

```bash
cd /Users/jtf/Developer/NLB-nantucket-landbank-main && npm install -w frontend @splidejs/splide@^4.1.4
git diff --stat package-lock.json frontend/package.json
```

Expected: `@splidejs/splide` added to `frontend/package.json` and the lockfile.

- [ ] **Step 2: Port the slider**

```bash
cp /Users/jtf/Developer/nlb-design/components/HistorySlider.tsx frontend/components/blocks/TimelineSlider.tsx
python3 - <<'EOF'
p='frontend/components/blocks/TimelineSlider.tsx'
s=open(p).read()
for old,new in [
  ('export type HistoryEvent','export type TimelineEvent'),
  ('type HistorySliderProps','type TimelineSliderProps'),
  ('events: HistoryEvent[]','events: TimelineEvent[]'),
  ('export default function HistorySlider({ events, className }: HistorySliderProps)','export default function TimelineSlider({ events, className }: TimelineSliderProps)'),
  ('hover:bg-hover-darker','hover:bg-(--ui-hover-darker)'),
]:
    assert old in s, old
    s=s.replace(old,new)
open(p,'w').write(s)
EOF
grep -n "HistorySlider\|HistoryEvent\|headline-2xl\|hover-darker" frontend/components/blocks/TimelineSlider.tsx
```

Expected: the grep prints only the `(--ui-hover-darker)` lines (no remaining `HistorySlider`/`HistoryEvent`/`headline-2xl`). The `history-slider*` CSS class names are kept on purpose (Task 1's CSS targets them).

The ported file imports `Splide` from `@splidejs/splide` and `@splidejs/splide/css/core`. If `eslint` flags anything in the ported file (for example the unused `rootRef`), fix it minimally and record it as a ruling; do not rewrite the slider's math.

- [ ] **Step 3: Replace the block component**

`frontend/components/blocks/Timeline.tsx`:

```tsx
import TimelineSlider, {type TimelineEvent} from './TimelineSlider'
import {BlockProps} from './types'

/**
 * Connector-line heights reproduce the Figma design's organic, non-uniform rhythm. Derived from
 * the entry's position (cycling), never authored or stored.
 */
const LINE_LENGTHS = [220, 333, 239, 279, 184, 301, 210, 349, 197, 265]

export default function Timeline({block}: BlockProps<'timeline'>) {
  const events: TimelineEvent[] = (block.entries ?? []).map((entry, index) => ({
    year: entry.year,
    title: entry.title,
    description: entry.description ?? '',
    lineLength: LINE_LENGTHS[index % LINE_LENGTHS.length],
  }))
  if (events.length === 0) return null
  return <TimelineSlider events={events} />
}
```

`git rm frontend/components/blocks/TimelineTrack.tsx`. Entries are shown in the order the editor sets (the `$ND` page ordered them most recent first by hand).

- [ ] **Step 4: Read the slider for the Review Focus edge cases**

Confirm by reading `TimelineSlider.tsx`: `indexToProgress` guards `end > 0` (so one slide, or fewer slides than `perPage`, does not divide by zero); `updateArrows` disables both arrows when `getEnd()` is 0; the effect depends on `[events]`, so a changed entry list re-mounts Splide. Record the result in the ledger. If any of these does not hold, fix it with the smallest guard.

- [ ] **Step 5: Gate, commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build` once to confirm Splide's CSS import and the bundle build.

```bash
git add -A frontend package-lock.json
git commit -m "feat: rework timeline as the nlb-design slider

Adds @splidejs/splide. The slider is ported unchanged apart from names and
token classes; connector heights are derived from entry order.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Gallery, docs, issues and final verification

**Files:**
- Modify: `studio/scripts/seedBlockGallery.ts`, `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-07-absorb-nlb-design-design.md`
- Create: `docs/design/` (moved from `$ND/docs`)

- [ ] **Step 1: Extend the gallery seed**

In `seedBlockGallery.ts`:
- Update `basicLeftRightText` to the new fields (`eyebrow`, `heading`, `headingLevel`, `rightContent` with a Heading 3, a paragraph, and an `anchorLinks` item with three rows: one `link`, one `download`, and one with a page-type link and no page chosen, which must not render), and remove its `body` and `button`.
- Add a `heroTertiary` with `headingLevel: 'h2'`, a `heroSecondary` with `variant: 'light-brown'`, a `missionStatement` (three links, one unresolved), and a `ctaContact` with images and a button.
- Make the `timeline` have 12 entries (to cycle past ten line lengths), and add a second `timeline` with a single entry.
- Add empty-state blocks: `missionStatement` with only a heading, `ctaContact` with nothing, `basicLeftRightText` with an empty `anchorLinks` (zero links).
- Because the script does nothing when a gallery page exists, document in its header that an existing gallery must be removed first (`-- --remove`) to pick up changes.

Run the dry run: `cd studio && npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry`
Expected: prints the plan (or "already exists"); nothing is written.

- [ ] **Step 2: Move the design docs in**

```bash
mkdir -p docs/design
cp /Users/jtf/Developer/nlb-design/docs/*.md docs/design/
cp -R /Users/jtf/Developer/nlb-design/docs/components docs/design/components
cp -R /Users/jtf/Developer/nlb-design/docs/figma-variable-tokens docs/design/figma-variable-tokens
cp /Users/jtf/Developer/nlb-design/docs/004-typography.css docs/design/
ls docs/design
```

Add `docs/design/README.md` (new, 10 lines): says these are `nlb-design`'s docs moved in on 2026-10-07, that `docs/DECISIONS.md` is the record for this repo, and that where they conflict `DECISIONS.md` wins. Do not edit the copied files.

- [ ] **Step 3: Record decisions**

Append a section `## 8. Absorbing nlb-design` to `docs/DECISIONS.md` (match the existing "Status / Why / Implication" format) covering: nlb-design's visuals win on overlap; the reworked and new blocks; the typography reconciliation table from this plan (new `text-headline-*` utilities, and why); hover tokens; tracking; the `tf-px` difference; and that Phase B follows.

- [ ] **Step 4: File the follow-up issues**

```bash
gh issue list --search "typography" --state all
gh issue create --title "Unify typography: text-h*, text-headline-* and text-headline-*" --body "Three heading systems now coexist: text-h1..h6 (WordPress theme port), the stepwise text-headline-* tokens in tokens.css (used by the footer), and text-headline-* (nlb-design). Pick one, migrate the others, and remove the rest. See docs/DECISIONS.md section 8."
gh issue create --title "Confirm design tokens that differ between nlb-design and tokens.css" --body "Needs the designer: letter-spacing for tags and eyebrows (nlb-design 2px vs Figma-measured 1.54px), hover overlay colours (translucent mixes vs the solid hex tokens), tf-px padding clamp, and the Lowlands hero panel colour. See docs/DECISIONS.md sections 7.5 and 8."
gh issue create --title "Compare reworked blocks to the Figma designs in Presentation" --body "Phase A blocks were built from nlb-design components and checked only by type-check, lint and a production build. Review the Block gallery draft in Studio Presentation at desktop and mobile widths against Figma, including the light-brown Hero - Secondary line art and the anchor link rows (Figma nodes 2668:7765 and 2668:12795 are not readable through the Figma tool)."
```

Record the issue numbers and add them to the spec's "Known gaps" section and to `DECISIONS.md` section 8.

- [ ] **Step 5: Final gate, commit**

Run the gate commands (separately) and `NODE_ENV=production npx next build`. Confirm no dev server is running. Then:

```bash
git add -A docs studio frontend sanity.schema.json
git commit -m "docs: move nlb-design docs in, record the absorption, extend the block gallery

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** shared UI (Tasks 1-2); `missionStatement`, `ctaContact` (7, 8); reworked `basicLeftRightText` with rich text restricted to H3-H6 and anchor links with a link/download icon at 16px spacing (3, 4); `heroTertiary` with an H2 option replacing Section Intro (5); `heroImage` as HeroQuaternary (6); `timeline` as HistorySlider with Splide (9); assets, tokens reconciliation and docs moved in (1, 10); `heroVideo` and `Footer` untouched; gallery extended and issues filed (10). Verification gate in Global Constraints and Task 10. Phase B is not touched.
- **Names checked across tasks:** `text-headline-*`, `py-s*`, `.basic-left-right__lines`, `.mission-statement__lines`, `LinkRow`, `LinkButton`, `Tag`, `anchorLinks`, `variant: 'prose' | 'basic'`, `TimelineSlider`/`TimelineEvent` are defined where produced and used with the same signatures later.
- **Judgement calls an executor may hit:** the ported `TimelineSlider` may trip lint (fix minimally, ledger it); generated unions may need a cast for `rightContent` into `PortableTextBlock[]`; `BlockImage` must accept the plain CTA images (Task 8); the `HeroImage` title becomes an `<h1>` where `nlb-design` used a `<p>` (ledger it).
