# WordPress blocks migration (slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eleven page-builder blocks from the `nlb-v2` WordPress theme exist as Sanity object types on `page.pageBuilder`, each rendered by a React component ported 1:1 from the theme's `render.php`.

**Architecture:** One Studio object type and one `frontend/components/blocks/*.tsx` component per block, registered in `BlockRenderer`. Shared Studio field helpers and one `BlockImage` component carry the repeated parts. Theme-only CSS helpers (`text-h1..h6`, `tf-px`, `tf-max-w`, section spacing, decorative line art) land in a new `frontend/css/blocks.css`, with the theme's palette mapped onto the existing Figma-named tokens in `tokens.css`.

**Tech Stack:** Sanity v3/v4 Studio, Next.js 16 (read `node_modules/next/dist/docs/` before Next work), Tailwind v4, `next-sanity` Portable Text, `sanity-image`, `sanity typegen`.

**Spec:** [docs/superpowers/specs/2026-10-07-wp-blocks-migration-design.md](../specs/2026-10-07-wp-blocks-migration-design.md). Theme source: `/Users/jtf/Local Sites/nlb/app/public/wp-content/themes/nlb-v2` (referred to below as `$THEME`).

## Global Constraints

- Port markup and classes 1:1 from `$THEME/blocks/<name>/render.php`; do not consult Figma.
- Only singletons get explicit `_id`s. Everything else lets Sanity generate one.
- Reuse the shared `link` and `button` objects. No parallel link shape.
- Add design tokens per feature, named after their Figma variables. Prefer an existing token over raw hex and flag the discrepancy in the task's commit message.
- Commit assets; never hotlink. Large artwork stays a file in `frontend/public/`.
- Anything rendered must degrade, never throw: every field except where noted is optional and an empty block renders without error.
- Derive component prop types from the generated query types (`ExtractPageBuilderType`). Never hand-write them.
- `frontend/sanity.types.ts`, `studio/sanity.types.ts` (if it changes) and `sanity.schema.json` are tracked build artifacts; run `npm run sanity:typegen` in `frontend` after any schema or query change and commit the result.
- Verification gate before any task is called done: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`.
- Do not leave a preview/dev server running. Start one only to verify, then stop it.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: `preview-news`, `preview-events`, `preview-projects`, `preview-properties`, `job-openings`; header/footer/menus; content import.

## Token and class translation table

Used by every component task. The theme's Tailwind classes map to this repo's tokens as follows (from `frontend/css/tokens.css` and `globals.css`):

| Theme class / value | This repo | Note |
|---|---|---|
| `text-[var(--color-warm-neutral-700)]`, `text-warm-neutral-700` | `text-moody-moor-700` | #6b5c47 vs #6d5948, near |
| `text-[var(--color-warm-neutral-800)]`, `text-warm-neutral-800` | `text-moody-moor-600` | #4b4234 vs #533b28, **warmer/redder: flag** |
| `bg-[var(--color-warm-neutral-150)]` | `bg-dusty-heath-900` | #f5eee6 vs #f3eee5, near |
| `bg-`/`border-[var(--color-warm-neutral-200)]` | `bg-`/`border-dusty-heath-800` | #ece3d7 vs #eee6d9, near |
| `bg-`/`border-[var(--color-warm-neutral-300)]` | `*-dusty-heath-600` | #dbcfbd vs #ddcdb4, near |
| `text-brand-moody-moor`, `bg-brand-moody-moor` | `text-moody-moor-500`, `bg-moody-moor-500` | identical #482f1a |
| `bg-[var(--color-warm-neutral-50)]`, `text-warm-neutral-50` | unchanged | `--color-warm-neutral-50` already exists in `globals.css` |
| `py-section-sm` | `py-section-p-sm` | 64px, exists in `globals.css` |
| `py-section-p-md` / `-lg` / `pb-section-p-xl` | same names | added in Task 1 |
| `pt-gap-lg` | same | `--spacing-gap-lg` exists |
| `font-mono uppercase tracking-widest text-sm` | unchanged | `--font-mono` is DM Mono in `tokens.css` |
| `text-h1`..`text-h6`, `tf-px`, `tf-max-w` | same names | added in Task 1 |
| hero-secondary Lowlands panel `#5F8154` | literal in `blocks.css` | the theme notes this hex was specified by the user; nearest token `lowlands-800` is `#63795b`. **Flag.** |

`alignfull` and `get_block_wrapper_attributes` are dropped: blocks are plain full-width `<section>`s.

## Review Focus

Input classes the spec implies but the happy path does not exercise. Each is pinned by a named step.

1. **A block with every optional field empty** (a freshly inserted block) renders without error or visible junk. Pinned in Task 7: the gallery ends with an "Empty states" run of every optional-field block, and the page must load with no console errors.
2. **A button whose link resolves to nothing** (page reference left empty or pointing at an unpublished page). It must not render a dead button or text posing as a link. Pinned in Task 3 (`linkResolver` guard) and Task 7 (gallery case).
3. **Jump-nav headings that are duplicated, empty, accented or punctuated** produce unique, stable anchor ids and no empty nav rows. Pinned in Task 5 by `frontend/scripts/verifyJumpNav.mts`.
4. **An image whose asset was deleted or has no alt** renders nothing (not a broken `<img>` or a throw). Pinned in Task 2 (`BlockImage` guard) and Task 7.
5. **Reduced-motion and keyboard users** on the scrollable carousel and timeline: the track is keyboard focusable and the timeline buttons do not animate when `prefers-reduced-motion` is set. Pinned in Task 4.

## File Structure

**Create (Studio)** under `studio/src/schemaTypes/`:
- `objects/blockFields.ts` — shared `eyebrowField`, `imageWithAltField`, `headingLevelField`
- `objects/{hero,heroImage,heroSecondary,heroTertiary,basicLeftRightText,imageCarousel,timeline,jumpNavContent,downloadBlock,mapTeaser,contactForm}.ts`
- `studio/scripts/seedBlockGallery.ts`

**Modify (Studio):** `objects/` registration in `index.ts`; `documents/page.ts` (`pageBuilder.of`, insert menu).

**Create (frontend):**
- `css/blocks.css` — theme helpers and block-specific CSS
- `public/images/blocks/{hero-secondary-lines.svg,hero-secondary-lines-lowlands.svg,hero-tertiary-lines.svg}`
- `components/blocks/{BlockImage,Eyebrow,types}.ts(x)`, one `.tsx` per block, `TimelineTrack.tsx`
- `sanity/lib/jumpNav.ts`, `scripts/verifyJumpNav.mts`

**Modify (frontend):** `css/globals.css` (import), `sanity/lib/queries.ts` (projection), `components/BlockRenderer.tsx`, `components/PageBuilder.tsx`, `components/PortableText.tsx` (optional `h3Ids`).

**Docs:** `docs/DECISIONS.md` (new section), spec (issue numbers, deviations).

---

### Task 1: Theme helpers, tokens and assets

**Files:**
- Create: `frontend/css/blocks.css`
- Create: `frontend/public/images/blocks/hero-secondary-lines.svg`, `hero-secondary-lines-lowlands.svg`, `hero-tertiary-lines.svg`
- Modify: `frontend/css/globals.css` (add import after `./tokens.css`)

**Interfaces:**
- Produces utilities and classes used by every later task: `text-h1`..`text-h6`, `tf-px`, `tf-max-w`, `py-section-p-md|lg`, `pb-section-p-xl`, `.hero-image__lines`, `.hero-secondary__panel[--lowlands|--moody-moor]`, `.hero-secondary__lines[--lowlands|--moody-moor]`, `.hero-tertiary__lines`, `.image-carousel__track`, `.image-carousel__slide`.

- [ ] **Step 1: Read the Next.js and Tailwind context**

Read `frontend/node_modules/next/dist/docs/` for the public-folder and CSS import sections (AGENTS.md requires it before Next work). Confirm `globals.css` line 2 is `@import './tokens.css';`.

- [ ] **Step 2: Copy the line-art assets**

```bash
THEME="/Users/jtf/Local Sites/nlb/app/public/wp-content/themes/nlb-v2/assets/images"
mkdir -p frontend/public/images/blocks
cp "$THEME/hero-secondary-lines.svg" "$THEME/hero-secondary-lines-lowlands.svg" "$THEME/hero-tertiary-lines.svg" frontend/public/images/blocks/
ls -la frontend/public/images/blocks
```

Expected: three files listed.

- [ ] **Step 3: Create `frontend/css/blocks.css`**

```css
/**
 * Page-builder block styles ported from the nlb-v2 WordPress theme (assets/src/main.css and each
 * blocks/<name>/style.css). Tokens live in tokens.css; this file adds only what the blocks need
 * and tokens.css does not have.
 *
 * Source of the fluid heading scale: docs in the theme, architecture.md "Typography". Linear
 * through (375px, mobile) and (1440px, desktop), extrapolated to 1920px for the ceiling.
 */

@theme {
  /* Section padding. The theme names these section-p-*; section-p-sm (64px) is in globals.css. */
  --spacing-section-p-md: 96px;
  --spacing-section-p-lg: 128px;
  --spacing-section-p-xl: 160px;
}

@utility heading-base {
  font-family: var(--font-primary);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.05em;
}

@utility text-h1 {
  @apply heading-base;
  font-size: clamp(2.5rem, 1.7738rem + 3.0986vw, 5.4921rem);
}

@utility text-h2 {
  @apply heading-base;
  font-size: clamp(2.1875rem, 1.6593rem + 2.2535vw, 4.3636rem);
}

@utility text-h3 {
  @apply heading-base;
  font-size: clamp(1.9375rem, 1.5854rem + 1.5023vw, 3.3882rem);
}

@utility text-h4 {
  @apply heading-base;
  font-size: clamp(1.75rem, 1.5299rem + 0.939vw, 2.6567rem);
}

@utility text-h5 {
  @apply heading-base;
  font-size: clamp(1.5625rem, 1.4525rem + 0.4695vw, 2.0158rem);
}

@utility text-h6 {
  @apply heading-base;
  font-size: clamp(1.375rem, 1.331rem + 0.1878vw, 1.5563rem);
}

/**
 * Fluid horizontal section padding: 1.5rem at 375px, 2.5rem at 1440px (matches the 40px global
 * margin exactly), extrapolated for the 1920px ceiling.
 */
:root {
  --tf-x: clamp(1.5rem, 1.1479rem + 1.5023vw, 2.9507rem);
}

@utility tf-px {
  padding-inline: var(--tf-x);
}

@utility tf-max-w {
  @apply max-w-[90rem] mx-auto;
}

/* Hero - Image: decorative line art inside the light card, cropped by the card's overflow. */
.hero-image__lines {
  background: url('/images/blocks/hero-secondary-lines.svg') center / 220% no-repeat;
  opacity: 0.35;
}

/**
 * Hero - Secondary. The panel colour and the line-art stroke are tuned per variant in the theme
 * (cream stroke at ~70% on green, brown stroke at ~40% on brown), so the art is two SVGs.
 * #5F8154 is the theme's own value for the Lowlands panel; the nearest token, lowlands-800, is
 * #63795b.
 */
.hero-secondary__panel--lowlands {
  background-color: #5f8154;
}

.hero-secondary__panel--moody-moor {
  background-color: var(--color-moody-moor-500);
}

.hero-secondary__lines {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.hero-secondary__lines--lowlands {
  background-image: url('/images/blocks/hero-secondary-lines-lowlands.svg');
  opacity: 0.6;
}

.hero-secondary__lines--moody-moor {
  background-image: url('/images/blocks/hero-secondary-lines.svg');
  opacity: 0.4;
}

.hero-tertiary__lines {
  background: url('/images/blocks/hero-tertiary-lines.svg') center / cover no-repeat;
}

/* Image Carousel: scroll-snap is not expressible as utilities alone. */
.image-carousel__track {
  scroll-snap-type: x mandatory;
}

.image-carousel__slide {
  scroll-snap-align: start;
}
```

- [ ] **Step 4: Import it**

In `frontend/css/globals.css`, change:

```css
@import 'tailwindcss';
@import './tokens.css';
```

to:

```css
@import 'tailwindcss';
@import './tokens.css';
@import './blocks.css';
```

- [ ] **Step 5: Verify the CSS compiles**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both exit 0. (CSS errors surface at build; run `npx next build` only if you suspect one, and do not leave a server running.)

- [ ] **Step 6: Commit**

```bash
git add frontend/css/blocks.css frontend/css/globals.css frontend/public/images/blocks
git commit -m "feat: add block theme helpers, fluid heading scale and line art

Token discrepancies to confirm with the designer: theme warm-neutral-800 (#4b4234)
maps to moody-moor-600 (#533b28), and the Lowlands hero panel keeps the theme's
#5F8154 rather than lowlands-800 (#63795b).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Block plumbing and the hero family

**Files:**
- Create: `studio/src/schemaTypes/objects/blockFields.ts`, `hero.ts`, `heroImage.ts`, `heroSecondary.ts`, `heroTertiary.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/schemaTypes/documents/page.ts`
- Create: `frontend/components/blocks/types.ts`, `BlockImage.tsx`, `Eyebrow.tsx`, `Hero.tsx`, `HeroImage.tsx`, `HeroSecondary.tsx`, `HeroTertiary.tsx`
- Modify: `frontend/components/BlockRenderer.tsx`, `frontend/components/PageBuilder.tsx`, `frontend/sanity/lib/queries.ts`

**Interfaces:**
- Produces `blockFields.ts`: `eyebrowField(): FieldDefinition`, `imageWithAltField(opts: {name?: string; title?: string; required?: boolean}): FieldDefinition`, `headingLevelField(initial: 'h1' | 'h2'): FieldDefinition`.
- Produces `components/blocks/types.ts`: `BlockProps<T extends PageBuilderSection['_type']> = {block: ExtractPageBuilderType<T>; index: number; pageId: string; pageType: string; pageName?: string}`.
- Produces `BlockImage({image, width, sizes?, className?, fill?})` and `Eyebrow({children, className?})`.
- Produces in `queries.ts`: `portableText(field: string): string` and `pageBuilderFields: string` (the projection later tasks extend).

- [ ] **Step 1: Studio field helpers**

Create `studio/src/schemaTypes/objects/blockFields.ts`:

```ts
import {defineField} from 'sanity'

/** The small uppercase label above a heading. Optional everywhere in the theme. */
export const eyebrowField = () =>
  defineField({
    name: 'eyebrow',
    title: 'Eyebrow',
    type: 'string',
    description: 'Short label shown in small capitals above the heading.',
  })

/**
 * An image with the alt text stored on the image itself, so it travels with the asset reference
 * in a query. Required where the block makes no sense without it.
 */
export const imageWithAltField = ({
  name = 'image',
  title = 'Image',
  required = false,
}: {name?: string; title?: string; required?: boolean} = {}) =>
  defineField({
    name,
    title,
    type: 'image',
    options: {hotspot: true},
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the image for people using a screen reader.',
        validation: required ? (rule) => rule.required() : undefined,
      }),
    ],
    validation: required ? (rule) => rule.required() : undefined,
  })

/**
 * The semantic level of a block's heading. A page with no hero above needs one real H1, so this
 * is an accessibility decision rather than a style choice.
 */
export const headingLevelField = (initial: 'h1' | 'h2') =>
  defineField({
    name: 'headingLevel',
    title: 'Heading level',
    type: 'string',
    options: {
      list: [
        {title: 'H1 (the page’s main heading)', value: 'h1'},
        {title: 'H2', value: 'h2'},
      ],
      layout: 'radio',
    },
    initialValue: initial,
    description: 'Use H1 only once per page.',
  })
```

- [ ] **Step 2: The four hero types**

`studio/src/schemaTypes/objects/hero.ts`:

```ts
import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/** Centred hero: eyebrow, heading, intro and a wide image. */
export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: ImageIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Intro', type: 'text', rows: 3}),
    imageWithAltField(),
  ],
  preview: {
    select: {title: 'heading', subtitle: 'eyebrow', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Hero', subtitle: subtitle || 'Hero', media}),
  },
})
```

`heroImage.ts`:

```ts
import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/**
 * Full-bleed photo with a light card holding the eyebrow and headline. All three fields are
 * required: the theme fell back to placeholder copy and the page's featured image, and a Sanity
 * page has neither.
 */
export const heroImage = defineType({
  name: 'heroImage',
  title: 'Hero - Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({...eyebrowField(), validation: (rule) => rule.required()}),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    imageWithAltField({required: true}),
  ],
  preview: {
    select: {title: 'heading', subtitle: 'eyebrow', media: 'image'},
    prepare: ({title, subtitle, media}) => ({
      title: title || 'Hero - Image',
      subtitle: subtitle || 'Hero - Image',
      media,
    }),
  },
})
```

`heroSecondary.ts`:

```ts
import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/** Two columns: a coloured panel (eyebrow and body over line art) beside an image. */
export const heroSecondary = defineType({
  name: 'heroSecondary',
  title: 'Hero - Secondary',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      ...eyebrowField(),
      description: 'Defaults to the page name when left empty.',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    imageWithAltField({required: true}),
    defineField({
      name: 'variant',
      title: 'Panel colour',
      type: 'string',
      options: {
        list: [
          {title: 'Green (Lowlands)', value: 'lowlands'},
          {title: 'Brown (Moody Moor)', value: 'moody-moor'},
        ],
        layout: 'radio',
      },
      initialValue: 'lowlands',
    }),
  ],
  preview: {
    select: {title: 'eyebrow', subtitle: 'body', media: 'image'},
    prepare: ({title, subtitle, media}) => ({
      title: title || 'Hero - Secondary',
      subtitle: subtitle || 'Hero - Secondary',
      media,
    }),
  },
})
```

`heroTertiary.ts`:

```ts
import {TextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField} from './blockFields'

/** Text-only hero: eyebrow and heading on the left, intro on the right, over line art. */
export const heroTertiary = defineType({
  name: 'heroTertiary',
  title: 'Hero - Tertiary',
  type: 'object',
  icon: TextIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Intro', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'heading', subtitle: 'eyebrow'},
    prepare: ({title, subtitle}) => ({
      title: title || 'Hero - Tertiary',
      subtitle: subtitle || 'Hero - Tertiary',
    }),
  },
})
```

- [ ] **Step 3: Register the types and the page builder**

In `studio/src/schemaTypes/index.ts`, add imports and entries (after `heroVideo` in both places):

```ts
import {hero} from './objects/hero'
import {heroImage} from './objects/heroImage'
import {heroSecondary} from './objects/heroSecondary'
import {heroTertiary} from './objects/heroTertiary'
```

```ts
  heroVideo,
  hero,
  heroImage,
  heroSecondary,
  heroTertiary,
```

In `studio/src/schemaTypes/documents/page.ts` replace `of: [{type: 'heroVideo'}],` with:

```ts
      of: [
        {type: 'heroVideo'},
        {type: 'hero'},
        {type: 'heroImage'},
        {type: 'heroSecondary'},
        {type: 'heroTertiary'},
      ],
```

and replace the `insertMenu` block (only `heroVideo` has a thumbnail, so the grid view would show broken images for the new types):

```ts
      options: {
        insertMenu: {filter: true},
      },
```

- [ ] **Step 4: Generate types and check the Studio**

Run: `cd frontend && npm run sanity:typegen && cd ../studio && npx tsc --noEmit`
Expected: both succeed; `git status` shows `sanity.schema.json` and `frontend/sanity.types.ts` changed. Run `git diff --stat` and confirm `frontend/sanity.types.ts` now contains `export type Hero = {`.

- [ ] **Step 5: Extend the GROQ projection**

In `frontend/sanity/lib/queries.ts`, immediately above `const pageFields`, add:

```ts
/** Projects a Portable Text field and resolves page references inside its link annotations. */
const portableText = (field: string) => /* groq */ `
  ${field}[]{
    ...,
    markDefs[]{
      ...,
      ${linkReference}
    }
  }
`

/**
 * The page builder's sections. Each block type that holds a reference, a file or Portable Text
 * adds a branch here; plain fields come through the spread.
 */
const pageBuilderFields = /* groq */ `
  pageBuilder[]{
    ...,
    _type == "heroVideo" => {
      ...,
      "videoUrl": video.asset->url
    },
  }
`
```

and in `pageFields` replace the inline `"pageBuilder": pageBuilder[]{ ... }` with `"pageBuilder": ${pageBuilderFields},`? `pageBuilderFields` already starts with `pageBuilder[]`, so write:

```ts
  "pageBuilder": pageBuilder[]{
    ...,
    _type == "heroVideo" => {
      ...,
      "videoUrl": video.asset->url
    },
  }
```

→

```ts
  ${pageBuilderFields}
```

(`portableText` is unused until Task 3; if `lint` flags it, add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` for this task only and remove it in Task 3.)

- [ ] **Step 6: Shared frontend pieces**

`frontend/components/blocks/types.ts`:

```ts
import {ExtractPageBuilderType, PageBuilderSection} from '@/sanity/lib/types'

export type BlockProps<T extends PageBuilderSection['_type']> = {
  block: ExtractPageBuilderType<T>
  index: number
  pageId: string
  pageType: string
  pageName?: string
}
```

`frontend/components/blocks/Eyebrow.tsx`:

```tsx
/** The small uppercase mono label that sits above a block's heading. */
export default function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={`font-mono uppercase tracking-widest text-sm ${className}`}>{children}</p>
}
```

`frontend/components/blocks/BlockImage.tsx`:

```tsx
import Image from '@/components/SanityImage'
import {ExtractPageBuilderType} from '@/sanity/lib/types'

type ImageValue = NonNullable<ExtractPageBuilderType<'hero'>['image']>

/**
 * A page-builder image. Renders nothing when the asset reference is missing (an image whose asset
 * was deleted comes back without one), so a block never shows a broken image.
 *
 * `fill` crops to the container (object-cover); otherwise the image keeps its own proportions.
 */
export default function BlockImage({
  image,
  width,
  sizes,
  className,
  fill = false,
}: {
  image?: ImageValue | null
  width: number
  sizes?: string
  className?: string
  fill?: boolean
}) {
  if (!image?.asset?._ref) return null
  return (
    <Image
      id={image.asset._ref}
      alt={image.alt ?? ''}
      width={width}
      hotspot={image.hotspot}
      crop={image.crop}
      mode={fill ? 'cover' : 'contain'}
      sizes={sizes}
      className={className}
    />
  )
}
```

- [ ] **Step 7: The four hero components**

`Hero.tsx` (port of `blocks/hero/render.php`):

```tsx
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function Hero({block}: BlockProps<'hero'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-24 text-center">
        {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-3">{block.eyebrow}</Eyebrow>}
        {block.heading && <h1 className="text-h1 mb-6">{block.heading}</h1>}
        {block.body && (
          <p className="text-moody-moor-600 max-w-[42rem] mx-auto">{block.body}</p>
        )}
        <BlockImage image={block.image} width={1360} sizes="(min-width: 1360px) 1360px, 100vw" className="w-full rounded mt-10" />
      </div>
    </section>
  )
}
```

`HeroImage.tsx` (port of `hero-image/render.php`):

```tsx
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroImage({block}: BlockProps<'heroImage'>) {
  return (
    <section className="relative overflow-hidden w-full min-h-[34.0625rem] md:min-h-[41.875rem]">
      <BlockImage
        image={block.image}
        width={1920}
        sizes="100vw"
        fill
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="pt-gap-lg pb-section-p-xl relative tf-px">
        <div className="tf-max-w">
          <div className="relative overflow-hidden rounded bg-warm-neutral-50 p-6 min-h-[24.0625rem] w-full md:w-[43.25rem] flex flex-col justify-between">
            <div className="hero-image__lines absolute inset-0 pointer-events-none" aria-hidden="true" />
            {block.eyebrow && (
              <Eyebrow className="relative z-10 text-moody-moor-600">{block.eyebrow}</Eyebrow>
            )}
            {block.heading && (
              <h1 className="relative z-10 text-h2 text-moody-moor-600">{block.heading}</h1>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

`HeroSecondary.tsx` (port of `hero-secondary/render.php`; eyebrow falls back to the page name):

```tsx
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroSecondary({block, pageName}: BlockProps<'heroSecondary'>) {
  const variant = block.variant === 'moody-moor' ? 'moody-moor' : 'lowlands'
  const eyebrow = block.eyebrow || pageName
  return (
    <section className="w-full">
      <div className="tf-px py-section-p-sm overflow-hidden">
        <div className="tf-max-w">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div
              className={`hero-secondary__panel--${variant} relative flex flex-col justify-between p-10 min-h-[320px] md:min-h-[420px]`}
            >
              <div
                className={`hero-secondary__lines hero-secondary__lines--${variant} absolute inset-0 pointer-events-none`}
                aria-hidden="true"
              />
              {eyebrow && (
                <Eyebrow className="relative z-10 text-warm-neutral-50 mb-3">{eyebrow}</Eyebrow>
              )}
              {block.body && <p className="relative z-10 text-warm-neutral-50">{block.body}</p>}
            </div>
            <BlockImage
              image={block.image}
              width={960}
              sizes="(min-width: 768px) 50vw, 100vw"
              fill
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
```

`HeroTertiary.tsx` (port of `hero-tertiary/render.php`):

```tsx
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroTertiary({block}: BlockProps<'heroTertiary'>) {
  return (
    <section className="w-full overflow-hidden">
      <div className="relative py-section-p-sm tf-px">
        <div className="tf-max-w">
          <div className="hero-tertiary__lines absolute inset-0 -z-10" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-6 lg:grid lg:gap-6 lg:grid-cols-12 lg:items-center">
            <div className="flex flex-col gap-6 lg:col-span-5">
              {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-0">{block.eyebrow}</Eyebrow>}
              {block.heading && <h1 className="text-h1 mb-0 text-moody-moor-500">{block.heading}</h1>}
            </div>
            {block.body && (
              <p className="text-moody-moor-600 lg:col-span-6 lg:col-start-7">{block.body}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Register in `BlockRenderer` and pass the page name**

In `frontend/components/BlockRenderer.tsx`: add `pageName?: string` to the local `BlockProps`; import and register:

```tsx
import Hero from '@/components/blocks/Hero'
import HeroImage from '@/components/blocks/HeroImage'
import HeroSecondary from '@/components/blocks/HeroSecondary'
import HeroTertiary from '@/components/blocks/HeroTertiary'
```

```tsx
const Blocks = {
  heroVideo: HeroVideo,
  hero: Hero,
  heroImage: HeroImage,
  heroSecondary: HeroSecondary,
  heroTertiary: HeroTertiary,
} as BlocksType
```

Add `pageName: pageName,` to the `React.createElement(Blocks[block._type], {...})` props and `pageName` to the destructured function arguments.

In `frontend/components/PageBuilder.tsx`, in `RenderSections`' `<BlockRenderer ... />` add `pageName={page.name ?? undefined}`.

- [ ] **Step 9: Verify**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && cd ../studio && npx tsc --noEmit`
Expected: all exit 0. If `ExtractPageBuilderType<'hero'>['image']` fails to resolve, typegen did not pick up the types: re-run Step 4.

- [ ] **Step 10: Commit**

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add hero, hero-image, hero-secondary and hero-tertiary blocks

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Basic Left Right Text

**Files:**
- Create: `studio/src/schemaTypes/objects/basicLeftRightText.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `documents/page.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/BlockRenderer.tsx`
- Create: `frontend/components/blocks/BasicLeftRightText.tsx`

**Interfaces:**
- Consumes: `eyebrowField`, `headingLevelField` (Task 2); `portableText()` and `pageBuilderFields` (Task 2); `linkResolver` from `@/sanity/lib/utils`; `ResolvedLink`; `CustomPortableText` from `@/components/PortableText`.
- Produces: block type `basicLeftRightText` with fields `eyebrow`, `heading`, `headingLevel: 'h1'|'h2'`, `body: blockContent`, `button: {buttonText, link}`, `rightContent: blockContent`.

- [ ] **Step 1: Schema**

`studio/src/schemaTypes/objects/basicLeftRightText.ts`:

```ts
import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, headingLevelField} from './blockFields'

/**
 * Two columns. The left is sticky and holds the eyebrow, heading, text and an optional button;
 * the right is free-form content (text, lists, images). The theme's right column could also hold
 * a Gravity Forms block; forms are deferred, so it cannot here.
 */
export const basicLeftRightText = defineType({
  name: 'basicLeftRightText',
  title: 'Basic - Left Right Text',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h2'),
    defineField({name: 'body', title: 'Left text', type: 'blockContent'}),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      description: 'Shown only when both the text and a link are filled in.',
    }),
    defineField({name: 'rightContent', title: 'Right column', type: 'blockContent'}),
  ],
  preview: {
    select: {title: 'heading', subtitle: 'eyebrow'},
    prepare: ({title, subtitle}) => ({
      title: title || 'Basic - Left Right Text',
      subtitle: subtitle || 'Basic - Left Right Text',
    }),
  },
})
```

Register `basicLeftRightText` in `index.ts` and add `{type: 'basicLeftRightText'}` to `pageBuilder.of`.

- [ ] **Step 2: Query branch**

In `pageBuilderFields`, after the `heroVideo` branch, add:

```ts
    _type == "basicLeftRightText" => {
      ...,
      ${portableText('body')},
      ${portableText('rightContent')},
      button{
        ...,
        ${linkFields}
      }
    },
```

Remove the `eslint-disable` from Task 2 if you added one.

- [ ] **Step 3: Typegen**

Run: `cd frontend && npm run sanity:typegen`
Expected: `BasicLeftRightText` type appears in `frontend/sanity.types.ts`.

- [ ] **Step 4: Component**

`frontend/components/blocks/BasicLeftRightText.tsx` (port of `basic-left-right-text/render.php`):

```tsx
import CustomPortableText from '@/components/PortableText'
import ResolvedLink from '@/components/ResolvedLink'
import {linkResolver} from '@/sanity/lib/utils'
import {DereferencedLink} from '@/sanity/lib/types'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function BasicLeftRightText({block}: BlockProps<'basicLeftRightText'>) {
  const isH1 = block.headingLevel === 'h1'
  const Heading = isH1 ? 'h1' : 'h2'
  const button = block.button
  // A button needs both its text and a link that resolves. A page reference left empty, or
  // pointing at an unpublished page, resolves to nothing and must not render as a dead button.
  const buttonLink = button?.link as DereferencedLink | undefined
  const showButton = Boolean(button?.buttonText && buttonLink && linkResolver(buttonLink))

  return (
    <section className="w-full">
      <div className={`${isH1 ? 'py-section-p-lg' : 'py-section-p-md'} tf-px`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 tf-max-w">
          <div className="md:sticky md:top-10 self-start">
            {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-3">{block.eyebrow}</Eyebrow>}
            {block.heading && <Heading className="text-h4 mb-6 text-pretty">{block.heading}</Heading>}
            {block.body && (
              <CustomPortableText className="text-moody-moor-600 mb-6" value={block.body} />
            )}
            {showButton && buttonLink && (
              <ResolvedLink
                link={buttonLink}
                className="inline-flex items-center gap-3 px-5 py-4 bg-dusty-heath-800 hover:bg-dusty-heath-600 rounded font-mono text-moody-moor-600 no-underline"
              >
                {button?.buttonText}
              </ResolvedLink>
            )}
          </div>
          <div>
            {block.rightContent && <CustomPortableText value={block.rightContent} />}
          </div>
        </div>
      </div>
    </section>
  )
}
```

If `type-check` reports that `block.body` is not assignable to `PortableTextBlock[]`, cast at the call site: `value={block.body as PortableTextBlock[]}` with `import type {PortableTextBlock} from 'next-sanity'`.

- [ ] **Step 5: Register**

In `BlockRenderer.tsx`: `import BasicLeftRightText from '@/components/blocks/BasicLeftRightText'` and `basicLeftRightText: BasicLeftRightText,` in `Blocks`.

- [ ] **Step 6: Verify and commit**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && cd ../studio && npx tsc --noEmit`
Expected: all exit 0.

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add basic left-right text block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Image Carousel and Timeline

**Files:**
- Create: `studio/src/schemaTypes/objects/imageCarousel.ts`, `timeline.ts`
- Create: `frontend/components/blocks/ImageCarousel.tsx`, `Timeline.tsx`, `TimelineTrack.tsx`
- Modify: `index.ts`, `page.ts`, `BlockRenderer.tsx`

**Interfaces:**
- Consumes: `eyebrowField`, `imageWithAltField`, `BlockImage`, `Eyebrow`, `BlockProps`.
- Produces: `imageCarousel` (`eyebrow`, `images[]: {_key, image, caption}`) and `timeline` (`entries[]: {_key, year, title, description}`). `TimelineTrack({children, label})` client component.

- [ ] **Step 1: Schemas**

`imageCarousel.ts`:

```ts
import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/** A horizontally scrolling row of captioned images. */
export const imageCarousel = defineType({
  name: 'imageCarousel',
  title: 'Image Carousel',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    eyebrowField(),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'carouselImage',
          fields: [
            imageWithAltField({required: true}),
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
          ],
          preview: {
            select: {title: 'caption', media: 'image'},
            prepare: ({title, media}) => ({title: title || 'Image', media}),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'eyebrow', images: 'images'},
    prepare: ({title, images}) => ({
      title: title || 'Image Carousel',
      subtitle: `${images?.length ?? 0} images`,
    }),
  },
})
```

`timeline.ts`:

```ts
import {ClockIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** Curated milestones in a horizontally scrolling row. */
export const timeline = defineType({
  name: 'timeline',
  title: 'Timeline',
  type: 'object',
  icon: ClockIcon,
  fields: [
    defineField({
      name: 'entries',
      title: 'Entries',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'timelineEntry',
          fields: [
            defineField({
              name: 'year',
              title: 'Year',
              type: 'string',
              description: 'Text, so “1983” and “Early 1980s” both work.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
          ],
          preview: {
            select: {title: 'title', subtitle: 'year'},
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {entries: 'entries'},
    prepare: ({entries}) => ({title: 'Timeline', subtitle: `${entries?.length ?? 0} entries`}),
  },
})
```

Register both in `index.ts` and add `{type: 'imageCarousel'}`, `{type: 'timeline'}` to `pageBuilder.of`. No query branch is needed (plain fields; image asset refs are enough).

- [ ] **Step 2: Typegen**

Run: `cd frontend && npm run sanity:typegen`

- [ ] **Step 3: Components**

`ImageCarousel.tsx` (port of `image-carousel/render.php`; the scroll region is keyboard focusable):

```tsx
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function ImageCarousel({block}: BlockProps<'imageCarousel'>) {
  const images = block.images?.filter((item) => item.image?.asset?._ref) ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-4">{block.eyebrow}</Eyebrow>}
        {images.length > 0 && (
          <div
            className="image-carousel__track flex gap-6 overflow-x-auto"
            role="region"
            aria-label={block.eyebrow || 'Image carousel'}
            tabIndex={0}
          >
            {images.map((item) => (
              <figure key={item._key} className="image-carousel__slide flex-none w-80 m-0">
                <BlockImage image={item.image} width={640} sizes="320px" className="w-full rounded" />
                {item.caption && (
                  <figcaption className="text-sm text-moody-moor-700 mt-2">{item.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

`TimelineTrack.tsx` (client; the theme's buttons had no behaviour, these scroll the track and skip the animation under reduced motion):

```tsx
'use client'

import {useRef} from 'react'

/** The scrolling row of timeline entries with working previous/next buttons. */
export default function TimelineTrack({children}: {children: React.ReactNode}) {
  const trackRef = useRef<HTMLOListElement>(null)

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  return (
    <>
      <ol
        ref={trackRef}
        className="flex gap-16 overflow-x-auto list-none m-0 p-0"
        aria-label="Timeline"
        tabIndex={0}
      >
        {children}
      </ol>
      <div className="flex gap-3 mt-6 justify-end">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="w-14 h-14 rounded-full border border-dusty-heath-600"
          aria-label="Previous"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="w-14 h-14 rounded-full border border-dusty-heath-600"
          aria-label="Next"
        >
          &rarr;
        </button>
      </div>
    </>
  )
}
```

`Timeline.tsx` (port of `timeline/render.php`):

```tsx
import TimelineTrack from './TimelineTrack'
import {BlockProps} from './types'

export default function Timeline({block}: BlockProps<'timeline'>) {
  const entries = block.entries ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {entries.length > 0 && (
          <TimelineTrack>
            {entries.map((entry) => (
              <li key={entry._key} className="flex-none w-56 border-l border-dusty-heath-600 pl-3">
                <span className="block text-h3">{entry.year}</span>
                <h3 className="text-h6 my-2">{entry.title}</h3>
                {entry.description && <p className="text-moody-moor-600">{entry.description}</p>}
              </li>
            ))}
          </TimelineTrack>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Register in `BlockRenderer.tsx`**

Imports for `ImageCarousel` and `Timeline`; entries `imageCarousel: ImageCarousel, timeline: Timeline,`.

- [ ] **Step 5: Verify and commit**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && cd ../studio && npx tsc --noEmit`
Expected: all exit 0.

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add image carousel and timeline blocks

Timeline previous/next buttons had no behaviour in the theme; they now scroll the track.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Jump Nav Content

**Files:**
- Create: `frontend/sanity/lib/jumpNav.ts`, `frontend/scripts/verifyJumpNav.mts`
- Create: `studio/src/schemaTypes/objects/jumpNavContent.ts`, `frontend/components/blocks/JumpNavContent.tsx`
- Modify: `index.ts`, `page.ts`, `queries.ts`, `BlockRenderer.tsx`, `frontend/components/PortableText.tsx`

**Interfaces:**
- Produces `frontend/sanity/lib/jumpNav.ts`: `slugify(text: string): string`; `buildJumpNav(blocks): {items: {id: string; text: string}[]; idByKey: Record<string, string>}` where `blocks` is `ReadonlyArray<{_key: string; _type: string; style?: string; children?: {text?: string}[]}> | null | undefined`.
- Produces `CustomPortableText` optional prop `h3Ids?: Record<string, string>` (block `_key` → heading id).

- [ ] **Step 1: Write the failing verification script**

`frontend/scripts/verifyJumpNav.mts`:

```ts
/**
 * Verifies the jump-nav id contract. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyJumpNav.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {buildJumpNav, slugify} from '../sanity/lib/jumpNav.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const h3 = (key: string, ...texts: string[]) => ({
  _key: key,
  _type: 'block',
  style: 'h3',
  children: texts.map((text) => ({text})),
})

check(slugify('Getting There') === 'getting-there', 'slugify lowercases and hyphenates')
check(slugify('Café & Bar!') === 'cafe-bar', 'slugify strips accents and punctuation')
check(slugify('  --  ') === '', 'slugify of only punctuation is empty')

const dup = buildJumpNav([h3('a', 'Parking'), h3('b', 'Parking'), h3('c', 'Parking')])
check(
  dup.items.map((i) => i.id).join(',') === 'parking,parking-2,parking-3',
  'duplicate headings get -2, -3 suffixes',
)
check(dup.idByKey.b === 'parking-2', 'ids are keyed by block _key for the heading renderer')

const empty = buildJumpNav([h3('a', '   '), h3('b', 'After')])
check(empty.items.length === 1 && empty.items[0].text === 'After', 'empty headings get no nav row')
check(empty.idByKey.a === 'section', 'empty headings still get an id')

const mixed = buildJumpNav([
  {_key: 'p', _type: 'block', style: 'normal', children: [{text: 'Body'}]},
  {_key: 'h', _type: 'block', style: 'h4', children: [{text: 'Sub'}]},
  {_key: 'i', _type: 'image'},
  h3('x', 'Real', ' heading'),
])
check(mixed.items.length === 1 && mixed.items[0].text === 'Real heading', 'only h3 blocks count; spans are joined')

check(buildJumpNav(null).items.length === 0, 'null input yields no items')
check(buildJumpNav(undefined).items.length === 0, 'undefined input yields no items')

if (failed) process.exit(1)
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd frontend && node scripts/verifyJumpNav.mts`
Expected: FAIL with `Cannot find module '.../sanity/lib/jumpNav.ts'`.

- [ ] **Step 3: Implement the helper**

`frontend/sanity/lib/jumpNav.ts` (no imports, so the script can load it directly):

```ts
export type JumpNavItem = {id: string; text: string}

type SpanLike = {text?: string}
type BlockLike = {_key: string; _type: string; style?: string; children?: SpanLike[]}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Derives a jump nav from a Portable Text body: every H3 is a section. Returns the nav rows and
 * an id for each H3 keyed by its block _key, so the heading renderer and the nav agree. Ids are
 * unique within the block; a heading with no text still gets an id (so its anchor exists) but no
 * nav row.
 */
export function buildJumpNav(blocks: ReadonlyArray<BlockLike> | null | undefined) {
  const items: JumpNavItem[] = []
  const idByKey: Record<string, string> = {}
  const used = new Set<string>()

  for (const block of blocks ?? []) {
    if (block._type !== 'block' || block.style !== 'h3') continue
    const text = (block.children ?? [])
      .map((child) => child.text ?? '')
      .join('')
      .trim()
    const base = slugify(text) || 'section'
    let id = base
    let n = 2
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)
    idByKey[block._key] = id
    if (text) items.push({id, text})
  }

  return {items, idByKey}
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `cd frontend && node scripts/verifyJumpNav.mts`
Expected: every line `ok`, exit 0. (Node 24 strips types natively. If your Node is older than 22.6, use `npx tsx scripts/verifyJumpNav.mts`.)

- [ ] **Step 5: Schema**

`studio/src/schemaTypes/objects/jumpNavContent.ts`:

```ts
import {ThListIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {headingLevelField} from './blockFields'

/**
 * A heading with a sticky section nav on the left and long-form content on the right. The nav is
 * not authored: it is built from the content's H3 headings, so editors maintain the content once.
 * H1 and H2 are not offered in the content because the block's own heading is the page-level
 * heading and H3 must unambiguously mean "a section of the nav".
 */
export const jumpNavContent = defineType({
  name: 'jumpNavContent',
  title: 'Jump Nav Content',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h1'),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      description: 'Each “Section heading (H3)” becomes a link in the left-hand nav.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Section heading (H3)', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'H5', value: 'h5'},
            {title: 'H6', value: 'h6'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {annotations: [{type: 'link'}]},
        }),
        defineArrayMember({type: 'image', options: {hotspot: true}}),
      ],
    }),
  ],
  initialValue: {headingLevel: 'h1'},
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Jump Nav Content', subtitle: 'Jump Nav Content'}),
  },
})
```

Headings in `headingLevelField('h1')` default to h1; the block field `headingLevel` has h1 as the theme default. Register in `index.ts` and `page.ts`.

- [ ] **Step 6: Query branch**

In `pageBuilderFields` add:

```ts
    _type == "jumpNavContent" => {
      ...,
      ${portableText('content')}
    },
```

- [ ] **Step 7: Typegen**

Run: `cd frontend && npm run sanity:typegen`

- [ ] **Step 8: Let `CustomPortableText` carry heading ids**

In `frontend/components/PortableText.tsx`: add `h3Ids` to the props and an `h3` renderer.

```tsx
export default function CustomPortableText({
  className,
  value,
  h3Ids,
}: {
  className?: string
  value: PortableTextBlock[]
  /** Block _key -> id for H3 headings, so a jump nav can link to them. */
  h3Ids?: Record<string, string>
}) {
```

Inside `components.block` (alongside `h1`, `h2`) add:

```tsx
      h3: ({children, value}) => (
        <h3 id={h3Ids?.[value?._key]} className="scroll-mt-10">
          {children}
        </h3>
      ),
```

`id={undefined}` renders nothing when `h3Ids` is absent, so existing callers are unchanged.

- [ ] **Step 9: Component**

`frontend/components/blocks/JumpNavContent.tsx` (port of `jump-nav-content/render.php`):

```tsx
import type {PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import {buildJumpNav} from '@/sanity/lib/jumpNav'

import {BlockProps} from './types'

export default function JumpNavContent({block}: BlockProps<'jumpNavContent'>) {
  const Heading = block.headingLevel === 'h2' ? 'h2' : 'h1'
  const content = block.content ?? []
  const {items, idByKey} = buildJumpNav(content)

  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-24">
        <div className="md:sticky md:top-10 self-start">
          {block.heading && <Heading className="text-h1 mb-8">{block.heading}</Heading>}
          {items.length > 0 && (
            <nav className="flex flex-col" aria-label={block.heading || 'Section navigation'}>
              {items.map((item) => (
                <a
                  key={item.id}
                  className="flex items-center justify-between py-4 border-b border-dusty-heath-800 no-underline text-moody-moor-600"
                  href={`#${item.id}`}
                >
                  <span>{item.text}</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              ))}
            </nav>
          )}
        </div>
        <div className="flex flex-col gap-10">
          {content.length > 0 && (
            <CustomPortableText value={content as PortableTextBlock[]} h3Ids={idByKey} />
          )}
        </div>
      </div>
    </section>
  )
}
```

If `buildJumpNav(content)` does not type-check against the generated union (image members have no `style`/`children`), widen the helper's `BlockLike` so `style` and `children` are optional (they already are) and `_type: string`; the generated image member satisfies it. Do not cast to `any`.

- [ ] **Step 10: Register, verify, commit**

Add `jumpNavContent: JumpNavContent` to `BlockRenderer.tsx`.

Run: `cd frontend && node scripts/verifyJumpNav.mts && npm run sanity:typegen && npm run type-check && npm run lint && cd ../studio && npx tsc --noEmit`
Expected: all exit 0.

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add jump nav content block with derived section nav

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Download Block, Map Teaser, Contact Form

**Files:**
- Create: `studio/src/schemaTypes/objects/downloadBlock.ts`, `mapTeaser.ts`, `contactForm.ts`
- Create: `frontend/components/blocks/DownloadBlock.tsx`, `MapTeaser.tsx`, `ContactForm.tsx`
- Modify: `index.ts`, `page.ts`, `queries.ts`, `BlockRenderer.tsx`

**Interfaces:**
- Produces `downloadBlock` (`downloads[]: {_key, label, file}`) with query-added `downloads[].fileUrl` and `downloads[].fileName`; `mapTeaser` (`heading`, `body`); `contactForm` (`heading`).

- [ ] **Step 1: Schemas**

`downloadBlock.ts`:

```ts
import {DownloadIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** A list of downloadable files. */
export const downloadBlock = defineType({
  name: 'downloadBlock',
  title: 'Download Block',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'downloads',
      title: 'Files',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'download',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Defaults to the file’s name when left empty.',
            }),
            defineField({
              name: 'file',
              title: 'File',
              type: 'file',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'file.asset.originalFilename'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {downloads: 'downloads'},
    prepare: ({downloads}) => ({
      title: 'Download Block',
      subtitle: `${downloads?.length ?? 0} files`,
    }),
  },
})
```

`mapTeaser.ts`:

```ts
import {PinIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A short teaser for the interactive map. The preview area is a placeholder, as in the theme; a
 * live preview is tracked as deferred work.
 */
export const mapTeaser = defineType({
  name: 'mapTeaser',
  title: 'Map Teaser',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Map Teaser', subtitle: 'Map Teaser'}),
  },
})
```

`contactForm.ts`:

```ts
import {EnvelopeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A contact form. Submissions are not built yet (the theme used Gravity Forms, which has no
 * equivalent here), so the site shows a placeholder where the form will go. Tracked as deferred
 * work.
 */
export const contactForm = defineType({
  name: 'contactForm',
  title: 'Contact Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'The form itself is not available yet; visitors see a short notice instead.',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Contact Form', subtitle: 'Contact Form'}),
  },
})
```

Register all three in `index.ts` and `page.ts`.

- [ ] **Step 2: Query branch**

In `pageBuilderFields` add:

```ts
    _type == "downloadBlock" => {
      ...,
      downloads[]{
        ...,
        "fileUrl": file.asset->url,
        "fileName": file.asset->originalFilename
      }
    },
```

- [ ] **Step 3: Typegen**

Run: `cd frontend && npm run sanity:typegen`

- [ ] **Step 4: Components**

`DownloadBlock.tsx` (port of `download-block/render.php`):

```tsx
import {BlockProps} from './types'

export default function DownloadBlock({block}: BlockProps<'downloadBlock'>) {
  const downloads = block.downloads?.filter((item) => item.fileUrl) ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-8">
        {downloads.length > 0 && (
          <ul className="list-none m-0 p-0">
            {downloads.map((item) => (
              <li key={item._key} className="border-b border-dusty-heath-800">
                <a
                  className="flex justify-between py-3 no-underline text-inherit"
                  href={item.fileUrl ?? undefined}
                  download
                >
                  <span>{item.label || item.fileName}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
```

`MapTeaser.tsx` (port of `map-teaser/render.php`; the preview box is the theme's placeholder):

```tsx
import {BlockProps} from './types'

export default function MapTeaser({block}: BlockProps<'mapTeaser'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.heading && <h2 className="text-h4 mb-4">{block.heading}</h2>}
        {block.body && <p className="text-moody-moor-600 max-w-[42rem]">{block.body}</p>}
        <div className="mt-6 h-80 bg-dusty-heath-900 rounded" aria-hidden="true" />
      </div>
    </section>
  )
}
```

`ContactForm.tsx` (disabled state in place of Gravity Forms):

```tsx
import {BlockProps} from './types'

export default function ContactForm({block}: BlockProps<'contactForm'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.heading && <h2 className="text-h4 mb-6">{block.heading}</h2>}
        <p className="text-moody-moor-700">The contact form isn’t available yet.</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Register, verify, commit**

Add `downloadBlock`, `mapTeaser`, `contactForm` to `Blocks` in `BlockRenderer.tsx`.

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && cd ../studio && npx tsc --noEmit`
Expected: all exit 0.

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add download, map teaser and contact form blocks

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Block gallery seed and browser verification

**Files:**
- Create: `studio/scripts/seedBlockGallery.ts`

**Interfaces:**
- Consumes: every block type from Tasks 2-6 and its field names.
- Produces: a page document `Block gallery` (slug `block-gallery`) with every block, plus an "Empty states" run.

- [ ] **Step 1: Write the script**

`studio/scripts/seedBlockGallery.ts`:

```ts
/**
 * Creates one page, "Block gallery", containing every page-builder block, so the blocks can be
 * checked in one place. Followed by an "Empty states" run: the same blocks with every optional
 * field empty, which must render without error.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --publish
 *   npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --remove
 *
 * What it writes: one `page` document with slug "block-gallery", created as an unpublished draft
 * (or published, with --publish), plus the sample image and file assets it references (uploads are
 * content-addressed, so re-running reuses them). Idempotent: if a page with that slug exists in
 * any state, it does nothing. It never overwrites or edits an existing page.
 *
 * --remove deletes the gallery page (draft and published) after printing what it will delete.
 * --publish makes the gallery publicly visible on the live site until it is removed: only use it
 * when that is acceptable.
 */

import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const PUBLISH = process.argv.includes('--publish')
const REMOVE = process.argv.includes('--remove')
const SLUG = 'block-gallery'

const key = () => randomUUID().slice(0, 8)

const text = (value: string, style = 'normal', extra: Record<string, unknown> = {}) => ({
  _type: 'block',
  _key: key(),
  style,
  markDefs: [],
  children: [{_type: 'span', _key: key(), text: value, marks: []}],
  ...extra,
})

const bullet = (value: string) => text(value, 'normal', {listItem: 'bullet', level: 1})

type Ref = {_type: 'reference'; _ref: string}
const imageValue = (ref: string, alt: string) => ({
  _type: 'image',
  asset: {_type: 'reference', _ref: ref} as Ref,
  alt,
})

async function findGallery() {
  return client.fetch<string[]>(
    `*[_type == "page" && slug.current == $slug]._id`,
    {slug: SLUG},
  )
}

async function removeGallery() {
  const ids = await findGallery()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Deleting ${ids.length} document(s): ${ids.join(', ') || '(none)'}`)
  if (DRY_RUN || ids.length === 0) return
  const tx = client.transaction()
  ids.forEach((id) => tx.delete(id))
  await tx.commit()
}

async function uploadImage(file: string) {
  const path = resolve(__dirname, '../../frontend/public/images/properties', file)
  const asset = await client.assets.upload('image', createReadStream(path), {filename: file})
  return asset._id
}

async function main() {
  if (REMOVE) return removeGallery()

  const existing = await findGallery()
  if (existing.length > 0) {
    console.log(`Block gallery already exists (${existing.join(', ')}). Nothing to do.`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry run] Would upload 3 images and 1 file, and create the Block gallery page.')
    return
  }

  const [beach, jetties, pond] = await Promise.all([
    uploadImage('dionis-beach.jpg'),
    uploadImage('jetties-beach.jpg'),
    uploadImage('long-pond.jpg'),
  ])
  const sample = await client.assets.upload('file', Buffer.from('Sample download'), {
    filename: 'sample-download.txt',
    contentType: 'text/plain',
  })

  const pageBuilder = [
    {
      _type: 'hero',
      _key: key(),
      eyebrow: 'Hero',
      heading: 'A centred hero heading',
      body: 'An intro paragraph under the heading, limited to a readable measure.',
      image: imageValue(beach, 'Dionis Beach'),
    },
    {
      _type: 'heroImage',
      _key: key(),
      eyebrow: 'Hero - Image',
      heading: 'A short, punchy headline goes here.',
      image: imageValue(jetties, 'Jetties Beach'),
    },
    {
      _type: 'heroSecondary',
      _key: key(),
      eyebrow: 'Our history',
      body: 'Lowlands variant: a coloured panel beside an image.',
      variant: 'lowlands',
      image: imageValue(pond, 'Long Pond'),
    },
    {
      _type: 'heroSecondary',
      _key: key(),
      body: 'Moody Moor variant, with no eyebrow so the page name is used.',
      variant: 'moody-moor',
      image: imageValue(beach, 'Dionis Beach'),
    },
    {
      _type: 'heroTertiary',
      _key: key(),
      eyebrow: 'Hero - Tertiary',
      heading: 'Text-only hero heading',
      body: 'Intro text on the right at desktop widths, stacked below on mobile.',
    },
    {
      _type: 'basicLeftRightText',
      _key: key(),
      eyebrow: 'Basic - Left Right Text',
      heading: 'Left column heading',
      headingLevel: 'h2',
      body: [text('Left column body text that stays in view while the right column scrolls.')],
      button: {_type: 'button', buttonText: 'A real link', link: {_type: 'link', linkType: 'href', href: '/map'}},
      rightContent: [
        text('Right column heading', 'h3'),
        text('Right column paragraph.'),
        bullet('First list item'),
        bullet('Second list item'),
        {_type: 'image', _key: key(), asset: {_type: 'reference', _ref: pond}, alt: 'Long Pond'},
      ],
    },
    {
      _type: 'jumpNavContent',
      _key: key(),
      heading: 'Jump nav heading',
      headingLevel: 'h1',
      content: [
        text('Parking', 'h3'),
        text('Where to park.'),
        text('Parking', 'h3'),
        text('A duplicate heading, which gets a different id.'),
        text('Café & Bar!', 'h3'),
        text('Accents and punctuation are stripped from the id.'),
        text('A sub heading', 'h4'),
        text('Not part of the nav.'),
      ],
    },
    {
      _type: 'imageCarousel',
      _key: key(),
      eyebrow: 'Image carousel',
      images: [
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach'},
        {_key: key(), _type: 'carouselImage', image: imageValue(jetties, 'Jetties Beach'), caption: 'Jetties Beach'},
        {_key: key(), _type: 'carouselImage', image: imageValue(pond, 'Long Pond'), caption: 'Long Pond'},
        {_key: key(), _type: 'carouselImage', image: imageValue(beach, 'Dionis Beach'), caption: 'Dionis Beach again'},
      ],
    },
    {
      _type: 'timeline',
      _key: key(),
      entries: [
        {_key: key(), _type: 'timelineEntry', year: '1983', title: 'First milestone', description: 'What happened.'},
        {_key: key(), _type: 'timelineEntry', year: '1990', title: 'Second milestone', description: 'What happened next.'},
        {_key: key(), _type: 'timelineEntry', year: '2001', title: 'Third milestone'},
        {_key: key(), _type: 'timelineEntry', year: '2015', title: 'Fourth milestone', description: 'And more.'},
        {_key: key(), _type: 'timelineEntry', year: '2024', title: 'Fifth milestone', description: 'Today.'},
      ],
    },
    {
      _type: 'downloadBlock',
      _key: key(),
      downloads: [
        {_key: key(), _type: 'download', label: 'A labelled file', file: {_type: 'file', asset: {_type: 'reference', _ref: sample._id}}},
        {_key: key(), _type: 'download', file: {_type: 'file', asset: {_type: 'reference', _ref: sample._id}}},
      ],
    },
    {_type: 'mapTeaser', _key: key(), heading: 'Map teaser', body: 'A short line above the map preview placeholder.'},
    {_type: 'contactForm', _key: key(), heading: 'Contact form'},

    // Empty states: every optional field empty. These must render without error or junk.
    {_type: 'hero', _key: key()},
    {_type: 'heroSecondary', _key: key()},
    {_type: 'heroTertiary', _key: key()},
    {
      _type: 'basicLeftRightText',
      _key: key(),
      heading: 'Empty state: button with no link',
      // Text but no link target, and a page link with no page chosen: neither may render a button.
      button: {_type: 'button', buttonText: 'Should not appear', link: {_type: 'link', linkType: 'page'}},
    },
    {_type: 'jumpNavContent', _key: key()},
    {_type: 'imageCarousel', _key: key()},
    {_type: 'timeline', _key: key()},
    {_type: 'downloadBlock', _key: key()},
    {_type: 'mapTeaser', _key: key()},
    {_type: 'contactForm', _key: key()},
  ]

  const doc = {
    // 'drafts.' makes Sanity generate the id, so this is an unpublished draft with no explicit id.
    _id: PUBLISH ? undefined : 'drafts.',
    _type: 'page',
    name: 'Block gallery',
    slug: {_type: 'slug', current: SLUG},
    pathOnly: false,
    pageBuilder,
  }

  const created = PUBLISH
    ? await client.create({...doc, _id: undefined} as never)
    : await client.create(doc as never)
  console.log(`Created ${created._id}${PUBLISH ? ' (published)' : ' (draft)'}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

If `_id: undefined` is rejected for the publish case, drop the key instead of passing `undefined`.

- [ ] **Step 2: Dry run**

Run: `cd studio && npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry`
Expected: `[dry run] Would upload 3 images and 1 file, and create the Block gallery page.` (or "already exists" if present). Nothing is written.

- [ ] **Step 3: Choose how to verify, and ask the user**

Stop and ask the user which they prefer; do not decide:
- **(a)** Seed as an unpublished draft; the user opens it in Studio Presentation and reviews. No public exposure.
- **(b)** Seed with `--publish`; the agent verifies in its own browser, then runs `--remove`. The page is publicly visible on the live site for the duration, because the deployed frontend reads the same dataset.

Then run the matching command: `cd studio && npx sanity exec scripts/seedBlockGallery.ts --with-user-token` (a) or `... -- --publish` (b). Expected: `Created <id>`.

- [ ] **Step 4: Verify in the browser (option b only; for (a) skip to Step 6)**

Start the frontend with `preview_start`, open `/block-gallery`, then check:
1. `read_console_messages` with `onlyErrors`: none.
2. `get_page_text`: contains "A centred hero heading", "Parking", "Café & Bar!", "A labelled file", "The contact form isn’t available yet."; does **not** contain "Should not appear".
3. Via `javascript_tool`: `[...document.querySelectorAll('h3[id]')].map(h => h.id)` includes `parking`, `parking-2`, `cafe-bar`; each nav link `a[href^="#"]` inside the jump nav targets an existing id; `document.querySelectorAll('img').length` equals the number of images that loaded with `naturalWidth > 0`.
4. `resize_window` to `mobile`, screenshot, then back to `desktop`; confirm no horizontal page scroll: `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
5. Click the timeline "Next" button and confirm the track's `scrollLeft` increased.
6. Compare each block's rendering side by side with the same content in the WordPress theme (open the local WP site in a second tab) and note visible differences.

- [ ] **Step 5: Stop the server and remove the gallery (option b)**

Run `preview_stop`, then:

```bash
cd studio && npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --remove
```

Expected: prints the document id(s) it deletes, then deletes them.

- [ ] **Step 6: Fix any defects found, re-verify, commit**

Fix defects in the owning component, re-run the verification gate, then:

```bash
git add studio/scripts/seedBlockGallery.ts
git commit -m "feat: add block gallery seed script for verifying page-builder blocks

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Deferred work, decisions and final verification

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-07-wp-blocks-migration-design.md`

- [ ] **Step 1: Search for existing issues**

```bash
gh issue list --search "WordPress migration" --state all
gh issue list --search "contact form" --state all
gh issue list --search "map teaser" --state all
```

Expected: none that duplicate the four below. If one exists, link to it instead of filing.

- [ ] **Step 2: File the issues**

```bash
gh issue create --title "WP migration slice 2: content types, archives and data-driven blocks" --body "Slice 2 of the nlb-v2 WordPress theme migration (spec: docs/superpowers/specs/2026-10-07-wp-blocks-migration-design.md). Covers staff, commissioners, news, events, public records, FAQ and job openings; reconciling the theme's property and project types with this repo's project; their archive pages; and the five blocks deferred from slice 1 because they list those types: preview-news, preview-events, preview-projects, preview-properties and job-openings. Theme source: Local Sites/nlb nlb-v2 theme."
gh issue create --title "WP migration slice 3: globals, filters and content import" --body "Slice 3 of the nlb-v2 WordPress theme migration. Covers the ACF options pages (footer, staff, commissioners, FAQ settings), the archive filters (news, properties, projects, public records), and importing the existing WordPress content into Sanity (see the sanity-migration skill)."
gh issue create --title "Contact form block has no submission backend" --body "The contactForm page-builder block renders a notice instead of a form. The WordPress theme used Gravity Forms, which has no equivalent here. Needs a decision on a provider or route handler, field definitions (the theme's forms were configured in WordPress), spam protection and validation, and an enabled form in components/blocks/ContactForm.tsx. Deferred from migration slice 1."
gh issue create --title "Map teaser block shows an empty placeholder instead of a map preview" --body "components/blocks/MapTeaser.tsx renders an empty grey box where the WordPress theme also rendered one (its data-component=\"map-teaser\" had no JS behind it). Replace with a small Mapbox preview or static map image linking to /map. Needs NEXT_PUBLIC_MAPBOX_TOKEN. Deferred from migration slice 1."
```

Record the four numbers.

- [ ] **Step 3: Update the spec**

In the spec's "Deferred work" section replace `Issue numbers: to be filled in when filed.` with the real numbers, e.g. `- Slice 2 tracking: #<n>` per bullet. In its "Deviations" list add:

```
6. The right column of `basicLeftRightText` takes Portable Text only: the theme's inline buttons and Gravity Forms block are not available there.
7. Carousel and timeline scroll regions are keyboard focusable (`tabIndex=0`, labelled region), which the theme's were not.
```

- [ ] **Step 4: Record the decision**

Append a section to `docs/DECISIONS.md` (match the style of an existing entry; read section 4 first) titled `## 7. Page-builder blocks` with these entries, each in the file's existing "Decision / Why / Status" format:

- Blocks are Sanity object types on `page.pageBuilder`; one `components/blocks/*.tsx` each, registered in `BlockRenderer`.
- Required fields replace the theme's placeholder fallback copy.
- A jump nav is derived from the content's H3s at render, never authored; ids come from `sanity/lib/jumpNav.ts` and are checked by `frontend/scripts/verifyJumpNav.mts`.
- Theme palette maps onto the Figma-named tokens; flagged discrepancies: warm-neutral-800 → moody-moor-600, and the Lowlands hero panel keeps `#5F8154`.

- [ ] **Step 5: Final verification gate**

Run, and read the output of each:

```bash
cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && node scripts/verifyJumpNav.mts
cd ../studio && npx tsc --noEmit
cd .. && git status --short
```

Expected: every command exits 0; `git status` is clean apart from the files committed in this task. Confirm no dev server is running with `preview_list`.

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "docs: record block migration decisions and deferred-work issues

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** all 11 blocks (Tasks 2-6); tokens/typography/assets (Task 1); query projection and type derivation (Tasks 2-6); jump-nav helper and verification script (Task 5); timeline buttons (Task 4); contact-form disabled and map-teaser placeholder (Task 6); dropped `anchor`/`alignfull` (translation table); seed script with `--dry`, idempotency and header (Task 7); deferred issues and spec/DECISIONS updates (Task 8); verification gate in Global Constraints and Task 8. `verifyPageRouting.ts` is not required (hierarchy untouched).
- **Names checked across tasks:** `eyebrowField`, `imageWithAltField`, `headingLevelField`, `BlockProps`, `BlockImage`, `Eyebrow`, `portableText`, `pageBuilderFields`, `buildJumpNav`, `h3Ids`, `TimelineTrack` are defined in the task that produces them and used with the same signatures later. Schema field names (`headingLevel`, `rightContent`, `button`, `variant`, `downloads[].fileUrl`) match the components and the seed script.
- **Known judgement calls an executor may hit:** generated union types may need a cast for `body`/`content` into `PortableTextBlock[]` (Tasks 3, 5); `_id: undefined` in the seed (Task 7); Node older than 22.6 needs `tsx` for the verify script.
