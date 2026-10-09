# News article page and map teaser rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every news article has a page at `/news/<slug>` built to the Figma template, and the Map Teaser block is rebuilt to the Figma Interactive Map Block design.

**Architecture:** `article` gains a rich-text `body`. A static route `app/news/[slug]` renders an `ArticleView` plus the existing news tiles (refactored into a shared `NewsPreviewView`). A pure `share.ts` builds Facebook and LinkedIn share addresses; a small client component handles the Share row. Map Teaser gets new fields and a two-panel component using committed Figma artwork.

**Tech Stack:** Sanity Studio, Next.js 16 (read `node_modules/next/dist/docs/` before Next work), Tailwind v4, `next-sanity`, `sanity typegen`.

**Spec:** [docs/superpowers/specs/2026-10-07-news-article-and-map-teaser-design.md](../specs/2026-10-07-news-article-and-map-teaser-design.md). Figma file key `jDXhDNzEJS26VpXp9JWzIv`: map block node `1910:9569`, article template node `1910:14863` (content frame `1910:14865`). Earlier plans for context: [phase B](2026-10-07-absorb-nlb-design-phase-b.md).

## Global Constraints

- Everything from the Phase A and B plans still holds: reuse the shared `link` and `button` objects; tokens named after Figma variables; Figma assets committed, never hotlinked; anything rendered degrades, never throws; types derive from generated query results; GROQ fragments are **constants** (never functions); enum-like strings go through `stegaClean`; no Tailwind class built by interpolation; mobile base with desktop behind `md:`; only singletons get explicit `_id`s; derivable values (an article's URL, its displayed date) are computed at render; a link that does not resolve, or is `#`, is not rendered as a link (`realHref`).
- Static routes win over `app/[...slug]`; an unmatched slug returns 404 (`notFound()`), never a 200 placeholder.
- Dates use the helpers in `frontend/sanity/lib/dates.ts` (`formatDate`).
- Generated files are tracked: run `npm run sanity:typegen` in `frontend` after schema or query changes and commit the result.
- Verification gate for every task: `npm run sanity:typegen`, `npm run type-check`, `npm run lint`, the check scripts (`verifyJumpNav`, `verifyFluidTokens`, `verifyDates`, and from Task 1 `verifyShare`) in `frontend`; `npx tsc --noEmit` and `npx sanity schema validate` in `studio`. Run them as separate commands, each under the tool timeout. Task 1 recreates `.superpowers/verify.sh` to run them.
- The shell refuses network downloads: the user fetches the Figma artwork (Task 1).
- Writing to the Sanity dataset needs the user's say-so in chat first; seeds write drafts only.
- Do not leave a dev server running.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: the news archive, filters, pagination ([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)); a call-to-action tile under "more news"; an Instagram button in the Share row; a live Mapbox map in the teaser.

## Decisions made in this plan

| Topic | Decision |
|---|---|
| Tile destination | `realHref(article.link)` if it resolves; otherwise `/news/<slug>`. The CTA tile keeps "plain tile when no link". |
| Tile grid lines | The grid drops `bg-border-light` + `gap-px` (empty cells would show the line colour once a row is not full) for a top and left border on the grid and a right and bottom border on each tile. Same look. |
| Article rich text | A third `CustomPortableText` variant, `article`: 20px between paragraphs, 40px around images, images full column width and 362px tall (the Figma image), headings from `text-headline-*`. |
| Share | Buttons read `window.location.href` when clicked: no site URL setting, nothing computed on the server. Copy-link success and failure are announced (`role="status"`). |
| "More news" | The 3 latest articles other than this one, no CTA tile; hidden when there are none. |
| Map panel positions | Figma's absolute positions (card, pin, button) become percentages of the map panel's width at `md:` and up, and a stacked layout below. The art is clipped by the panel. To be compared with Figma in Presentation ([#15](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/15)). |
| Pin artwork | The Figma pin is a gold glyph exported as a mask SVG plus a fill SVG. Task 2 inspects both files and uses the fill SVG as an `<img>`; if it is only a flat rectangle, it is composited with the mask via CSS `mask-image`. |

## Review Focus

1. **Partial articles.** No body, no image, no categories, no date, a body that is only an image. The page renders its title and whatever exists, never "null" or a throw. Pinned in Task 3 and the Task 5 gallery/seed.
2. **Tile links.** An article with its own `link`; with `#`; with no link and a slug; with a link that resolves to nothing. Pinned in Task 3.
3. **Routing.** An unknown slug is a 404; a draft article opens in Presentation but is not statically generated or in the sitemap; the route does not shadow a CMS page at `/news`. Pinned in Task 4.
4. **Share row.** Clipboard unavailable (insecure context), pop-ups blocked, no `window` during server render; the share addresses encode the page URL and drop its fragment. Pinned by `verifyShare.mts` (Task 1) and Task 4.
5. **Map teaser.** No featured property, a property with no name or no image, an unresolvable button link, the layout below `md:` not overflowing. Pinned in Task 2.

## File Structure

**Create:** `frontend/sanity/lib/share.ts`, `frontend/scripts/verifyShare.mts`; `frontend/components/{ArticleView,ShareLinks}.tsx`, `frontend/components/blocks/NewsPreviewView.tsx`; `frontend/app/news/[slug]/page.tsx`; artwork under `frontend/public/images/blocks/`.

**Modify:** `studio/src/schemaTypes/{documents/article.ts,objects/mapTeaser.ts}`, `studio/sanity.config.ts`, `studio/scripts/{seedPhaseBContent.ts,seedBlockGallery.ts}`; `frontend/sanity/lib/queries.ts`, `frontend/app/sitemap.ts`, `frontend/components/{PortableText.tsx,BlockRenderer.tsx unchanged,icons/index.tsx,ui/ButtonLink.tsx}`, `frontend/components/blocks/{NewsPreview,MapTeaser}.tsx`, `frontend/css/ui.css`; `docs/DECISIONS.md`.

---

### Task 1: Artwork, the link icon and the share helper

**Files:**
- Create: `.superpowers/verify.sh` (not tracked), `frontend/sanity/lib/share.ts`, `frontend/scripts/verifyShare.mts`
- Add: artwork in `frontend/public/images/blocks/`
- Modify: `frontend/components/icons/index.tsx`

**Interfaces:**
- Produces `shareUrl(network: 'facebook' | 'linkedin', pageUrl: string): string` ('' when `pageUrl` is not a valid URL), `ShareNetwork`.
- Produces `LinkAltIcon({className})` (`currentColor`).
- Produces assets: `map-teaser-lines.svg`, `map-outline.svg`, `map-pin-mask.svg`, `map-pin.svg`, `article-curve.svg`.

- [ ] **Step 1: Recreate the gate script**

```bash
cat > .superpowers/verify.sh <<'EOF'
#!/bin/bash
set -e
cd /Users/jtf/Developer/NLB-nantucket-landbank-main/frontend
npm run type-check
npm run lint
node scripts/verifyJumpNav.mts
node scripts/verifyFluidTokens.mts
node scripts/verifyDates.mts
[ -f scripts/verifyShare.mts ] && node scripts/verifyShare.mts
cd ../studio && npx tsc --noEmit
npx sanity schema validate
EOF
chmod +x .superpowers/verify.sh
```

- [ ] **Step 2: Ask the user to fetch the artwork**

The shell cannot download. Tell the user, in chat, to run this block (it writes the five files and a temporary icon into the repo), then wait for them to say it is done. The URLs come from the Figma MCP design context and expire about a week after 2026-10-07; if they have expired, re-run `get_design_context` for nodes `1910:9569` and `1910:14865` for fresh ones.

```bash
cd /Users/jtf/Developer/NLB-nantucket-landbank-main/frontend/public/images/blocks
curl -sL -o map-teaser-lines.svg "https://www.figma.com/api/mcp/asset/b7644f15-aa27-4df7-973b-75aa9f5c0534.svg"
curl -sL -o map-outline.svg "https://www.figma.com/api/mcp/asset/1bfcb3de-6c35-403b-b12a-b060563a78f2.svg"
curl -sL -o map-pin-mask.svg "https://www.figma.com/api/mcp/asset/2a1de2db-6556-438e-8ad8-a738d58f1b29.svg"
curl -sL -o map-pin.svg "https://www.figma.com/api/mcp/asset/7da45721-69bd-40c0-9e52-905f3dafeb9c.svg"
curl -sL -o article-curve.svg "https://www.figma.com/api/mcp/asset/bd8597d8-01f5-40fb-a5ba-8040c6acacc4.svg"
curl -sL -o icon-link-alt.svg "https://www.figma.com/api/mcp/asset/493b86bf-233a-4700-a5e4-d5faf3111494.svg"
ls -la map-teaser-lines.svg map-outline.svg map-pin-mask.svg map-pin.svg article-curve.svg icon-link-alt.svg
```

- [ ] **Step 3: Verify the files are real SVGs**

```bash
cd frontend/public/images/blocks
for f in map-teaser-lines map-outline map-pin-mask map-pin article-curve icon-link-alt; do printf "%-18s %s bytes  " $f $(wc -c < $f.svg); head -c 60 $f.svg | tr '\n' ' '; echo; done
```

Expected: each is non-empty and starts with `<svg`. If any begins with something else (an error page), stop and ask the user to re-run Step 2 after fresh URLs are fetched.

- [ ] **Step 4: The link icon as an inline component**

Read `frontend/public/images/blocks/icon-link-alt.svg`. Append to `frontend/components/icons/index.tsx` a `LinkAltIcon` using that file's `viewBox` and path data, with `stroke`/`fill` colours changed to `currentColor`, the root `width`/`height`/`style` attributes dropped, and the same `aria-hidden`/`focusable`/`className` pattern as the other icons:

```tsx
/** Link, from the Figma news template's Share row (Icon / link-alt). 24 x 24. */
export function LinkAltIcon({className}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* paste the path(s) from icon-link-alt.svg here, with colours set to currentColor */}
    </svg>
  )
}
```

The comment line above is an instruction for this step, not code to leave behind: replace it with the real `<path>` elements. Then `git rm --cached -q frontend/public/images/blocks/icon-link-alt.svg 2>/dev/null; rm frontend/public/images/blocks/icon-link-alt.svg` (it was only a source for the component).

- [ ] **Step 5: Write the failing share check**

`frontend/scripts/verifyShare.mts`:

```ts
/**
 * Verifies the share addresses. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyShare.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on failure.
 */
import {shareUrl} from '../sanity/lib/share.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const page = 'https://www.nantucketlandbank.org/news/the-benefits-of-walking'

same(
  shareUrl('facebook', page),
  'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking',
  'Facebook gets the encoded page address',
)
same(
  shareUrl('linkedin', page),
  'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking',
  'LinkedIn gets the encoded page address',
)
same(
  shareUrl('facebook', `${page}?a=1&b=2#comments`),
  'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking%3Fa%3D1%26b%3D2',
  'the query is kept (and encoded) and the fragment is dropped',
)
same(shareUrl('facebook', 'not a url'), '', 'an invalid address gives no share address')
same(shareUrl('linkedin', ''), '', 'an empty address gives no share address')

if (failed) process.exit(1)
```

- [ ] **Step 6: Run it and watch it fail**

Run: `cd frontend && node scripts/verifyShare.mts`
Expected: FAIL with `Cannot find module '.../sanity/lib/share.ts'`.

- [ ] **Step 7: Implement**

`frontend/sanity/lib/share.ts`:

```ts
export type ShareNetwork = 'facebook' | 'linkedin'

/**
 * The address that opens a network's share dialog for a page. The page's fragment is dropped (it
 * is a position on this page, not part of what is shared). An invalid address gives '' so a caller
 * can skip the share instead of opening a broken window.
 */
export function shareUrl(network: ShareNetwork, pageUrl: string): string {
  let page: URL
  try {
    page = new URL(pageUrl)
  } catch {
    return ''
  }
  page.hash = ''
  const encoded = encodeURIComponent(page.toString())
  return network === 'facebook'
    ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
    : `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
}
```

- [ ] **Step 8: Run it and watch it pass**

Run: `cd frontend && node scripts/verifyShare.mts`
Expected: every line `ok`, exit 0.

- [ ] **Step 9: Gate and commit**

Run the gate commands (separately).

```bash
git add frontend
git commit -m "feat: add the share-address helper, the link icon and the map and article artwork

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rebuild Map Teaser

**Files:**
- Modify: `studio/src/schemaTypes/objects/mapTeaser.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/blocks/MapTeaser.tsx`, `frontend/components/ui/ButtonLink.tsx`, `frontend/css/ui.css`

**Interfaces:**
- Consumes: Task 1 artwork; `BlockImage`, `Eyebrow`, `ButtonLink`, `linkResolver`, `realHref`, `DereferencedLink`, `linkFields`.
- Produces: `mapTeaser` with `eyebrow`, `heading`, `body`, `featuredProject` (reference to `project`; the query adds `name`, `description`, `image`), `button` (`buttonText`, `link`). `ButtonLink` gains `rightIcon?: boolean` (an arrow after the label).

- [ ] **Step 1: Look at the pin artwork**

Read `frontend/public/images/blocks/map-pin.svg` and `map-pin-mask.svg`. The Figma pin is the gold "add location" glyph (a map pin with a plus), 55px square. If `map-pin.svg` already contains a pin-shaped path in gold, it is used as a plain image below. If it is only a flat gold rectangle, use it as the background of an element masked by `map-pin-mask.svg` (CSS `mask-image`, `mask-size: 55px 55px`). Record which in the ledger.

- [ ] **Step 2: Schema**

Replace `mapTeaser.ts`:

```ts
import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A teaser for the interactive map (Figma: Interactive Map Block): a brown panel with text, and a
 * map panel with a static illustration, a pin and a card for one featured property. The map is
 * artwork, not a live map.
 */
export const mapTeaser = defineBlock({
  name: 'mapTeaser',
  title: 'Map Teaser',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      initialValue: 'Our interactive map',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Find properties, explore the island.',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    defineField({
      name: 'featuredProject',
      title: 'Featured property',
      type: 'reference',
      to: [{type: 'project'}],
      description: 'Fills the detail card on the map. Leave empty to hide the card.',
    }),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      initialValue: {
        buttonText: 'View the map',
        link: {_type: 'link', linkType: 'href', href: '/map'},
      },
    }),
  ],
  preview: {
    select: {title: 'heading', eyebrow: 'eyebrow'},
    prepare: ({title, eyebrow}) => ({title: title || eyebrow || 'No heading yet', subtitle: 'Map Teaser'}),
  },
})
```

- [ ] **Step 2b: Query branch**

In `pageBuilderFields` add (next to the other branches):

```ts
    _type == "mapTeaser" => {
      ...,
      button{
        ...,
        ${linkFields}
      },
      "featuredProject": featuredProject->{name, description, image}
    },
```

Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 3: `ButtonLink` gets an arrow**

In `components/ui/ButtonLink.tsx` add `rightIcon?: boolean` to the props (default `false`), import `ArrowRightIcon` from `@/components/icons`, and render `{rightIcon && <ArrowRightIcon className="size-6 shrink-0" />}` after the label inside the anchor.

- [ ] **Step 4: Map art CSS**

Append to `frontend/css/ui.css`:

```css
/* Map Teaser (Figma 1910:9569). The brown panel's line art is a very wide drawing, positioned as
   in the design: 10381 x 1369, offset -541px from the top. */
.map-teaser__lines {
  background: url('/images/blocks/map-teaser-lines.svg') 0 -541px / 10381.64px 1369.495px no-repeat;
}
```

- [ ] **Step 5: Component**

Replace `frontend/components/blocks/MapTeaser.tsx` (port of Figma `1910:9569`; positions are percentages of the 680px map panel at `md:` and up):

```tsx
import Image from 'next/image'

import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function MapTeaser({block}: BlockProps<'mapTeaser'>) {
  const project = block.featuredProject
  const buttonHref = realHref(
    block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null,
  )
  const showButton = Boolean(block.button?.buttonText && buttonHref)

  return (
    <section className="w-full bg-background tf-px py-10">
      <div className="tf-max-w flex flex-col md:flex-row">
        <div className="relative flex min-h-[28rem] flex-1 flex-col justify-between gap-16 overflow-clip bg-accent-primary p-10 md:h-[620px] md:min-h-0">
          <div className="map-teaser__lines pointer-events-none absolute inset-0" aria-hidden="true" />
          {block.eyebrow && (
            <Eyebrow className="relative z-10 text-on-accent-primary">{block.eyebrow}</Eyebrow>
          )}
          <div className="relative z-10 flex w-full flex-col items-start gap-6 text-on-accent-primary">
            {block.heading && <h2 className="w-full text-headline-xl">{block.heading}</h2>}
            {block.body && (
              <p className="w-full font-sans text-body-large leading-[1.6]">{block.body}</p>
            )}
          </div>
        </div>

        <div className="relative min-h-[34rem] flex-1 overflow-clip bg-surface-dark md:h-[620px] md:min-h-0">
          <Image
            src="/images/blocks/map-outline.svg"
            alt=""
            aria-hidden="true"
            width={985}
            height={570}
            className="pointer-events-none absolute left-[-123px] top-[10.59px] h-[569.646px] w-[984.732px] max-w-none"
          />
          {/* PIN: use map-pin.svg as an image; see Step 1 if it needs the mask instead. */}
          <Image
            src="/images/blocks/map-pin.svg"
            alt=""
            aria-hidden="true"
            width={55}
            height={55}
            className="pointer-events-none absolute left-[31%] top-[344px] size-[55px] max-w-none"
          />
          {project?.name && (
            <div className="absolute left-1/2 top-[93px] w-[262px] -translate-x-1/2 overflow-clip rounded-[6px] drop-shadow-[0_8px_10px_rgba(0,0,0,0.04)] md:left-[39.5%] md:translate-x-0">
              <div className="relative h-[134px] w-full bg-dusty-heath-800">
                <BlockImage
                  image={project.image}
                  width={524}
                  sizes="262px"
                  fill
                  className="size-full object-cover"
                />
              </div>
              <div className="flex w-full flex-col items-start gap-2 bg-surface-light p-5 leading-[1.6] text-on-surface-light">
                <p className="w-full font-mono text-body-base">{project.name}</p>
                {project.description && (
                  <p className="line-clamp-2 w-full font-sans text-[14px]">{project.description}</p>
                )}
              </div>
            </div>
          )}
          {showButton && buttonHref && (
            <ButtonLink
              label={block.button?.buttonText ?? ''}
              href={buttonHref}
              rightIcon
              className="absolute bottom-5 right-5 md:bottom-[43px] md:right-[10%]"
            />
          )}
        </div>
      </div>
    </section>
  )
}
```

The `{/* PIN … */}` comment is an instruction: apply Step 1's finding, then delete the comment (if the mask is needed, replace the pin `<Image>` with `<div className="absolute left-[31%] top-[344px] size-[55px] bg-[url('/images/blocks/map-pin.svg')] [mask:url('/images/blocks/map-pin-mask.svg')_no-repeat_center/55px_55px]" aria-hidden="true" />`). `ButtonLink` renders a plain `<a>`; an internal `/map` link causing a full page load is a known deferred minor (Phase A review).

- [ ] **Step 6: Gate and commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build`. Expected: all pass; the build compiles.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: rebuild the map teaser to the Figma interactive map block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Article body, queries and tile links

**Files:**
- Modify: `studio/src/schemaTypes/documents/article.ts`, `frontend/sanity/lib/queries.ts`, `frontend/components/blocks/NewsPreview.tsx`
- Create: `frontend/components/blocks/NewsPreviewView.tsx`

**Interfaces:**
- Produces: `article.body`; queries `articleQuery` (by `$slug`), `moreNewsQuery` (`$slug` excluded, 3), `articleSlugs`, `articleSitemapData`; the shared constant `articleCardFields` (now includes `"slug"`).
- Produces `NewsPreviewView({heading, articles, cta})`: `articles` is the `newsPreview` block's `articles` item array; `cta` is `{heading?: string | null; label?: string | null; href: string | null} | null`.

- [ ] **Step 1: Schema**

In `article.ts`, add after the `image` field:

```ts
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      description: 'The article text. Paragraphs, images, Heading 3-6 and anchor links are available.',
    }),
```

Update the doc comment above the type: an article has a page at `/news/<slug>`; `link` is now an optional override for the tile (an external story).

- [ ] **Step 2: Queries**

In `queries.ts`, add a constant above the `pageBuilderFields` constant and use it in the `newsPreview` branch:

```ts
/** What a news tile needs. Shared by the News Preview block and the article page's "more news". */
const articleCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  date,
  image,
  link{
    ...,
    ${linkReference}
  },
  "categories": categories[]->{"slug": slug.current, title}
`
```

Change the `newsPreview` branch's `"articles": …{ … }` projection body to `${articleCardFields}`. Then add, after `landingPageQuery`:

```ts
export const articleQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    date,
    image,
    "categories": categories[]->{"slug": slug.current, title},
    body[]{
      ...,
      _type == "anchorLinks" => {
        links[]{
          ...,
          ${linkFields}
        }
      },
      ${markDefsFields}
    }
  }
`)

/** The latest articles other than the one being read. */
export const moreNewsQuery = defineQuery(`
  *[_type == "article" && defined(slug.current) && slug.current != $slug]
    | order(date desc) [0...3] {
    ${articleCardFields}
  }
`)

export const articleSlugs = defineQuery(`
  *[_type == "article" && defined(slug.current)]{"slug": slug.current}
`)

export const articleSitemapData = defineQuery(`
  *[_type == "article" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)
```

Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 3: Move the tiles into `NewsPreviewView`**

Create `frontend/components/blocks/NewsPreviewView.tsx` by moving the body of `NewsPreview.tsx` into it, with these changes (port of `$ND`'s news preview; behaviour of the block is unchanged except the link rule and the grid lines):

```tsx
import Image from 'next/image'
import Link from 'next/link'

import {ArrowDownRightIcon} from '@/components/icons'
import {formatDate} from '@/sanity/lib/dates'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

type Article = NonNullable<BlockProps<'newsPreview'>['block']['articles']>[number]

type Cta = {heading?: string | null; label?: string | null; href: string | null}

/** A tile that is a link only when it has a destination; otherwise a plain element. */
function Tile({href, className, children}: {href: string | null; className: string; children: React.ReactNode}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

export default function NewsPreviewView({
  heading,
  articles,
  cta,
}: {
  heading?: string | null
  articles: Article[]
  cta?: Cta | null
}) {
  const showCta = Boolean(cta && (cta.heading || cta.label))
  if (articles.length === 0 && !showCta) return null

  return (
    <section className="overflow-x-clip bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {heading && <h2 className="w-full text-headline-xl text-on-background">{heading}</h2>}
        <div className="grid w-full grid-cols-1 border-t border-l border-border-light md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            // The article's own link wins (an external story); otherwise its page.
            const href =
              realHref(article.link ? linkResolver(article.link as DereferencedLink) : null) ??
              (article.slug ? `/news/${article.slug}` : null)
            const category = (article.categories ?? []).find((c) => c?.title)?.title
            const date = formatDate(article.date)
            return (
              <Tile
                key={article._id}
                href={href}
                className="flex w-full min-w-0 flex-col items-start gap-8 overflow-clip border-r border-b border-border-light bg-background p-8"
              >
                {/* …the existing tile body: image, title, category and date, unchanged… */}
              </Tile>
            )
          })}
          {showCta && cta && (
            <Tile
              href={cta.href}
              className="relative flex w-full min-w-0 flex-col items-start justify-between gap-8 overflow-clip border-r border-b border-border-light bg-accent-secondary p-10 md:col-span-2 lg:col-span-1"
            >
              {/* …the existing call-to-action tile body, reading cta.heading and cta.label… */}
            </Tile>
          )}
        </div>
      </div>
    </section>
  )
}
```

Replace each `{/* … */}` line with the tile body from the current `NewsPreview.tsx` verbatim (the image, title, category and date markup; the CTA's line art, text, label and arrow), reading `cta.heading` / `cta.label` where it read `block.ctaHeading` / `block.ctaLabel`. The comments are instructions, not code to leave behind.

Replace `NewsPreview.tsx` with the block wrapper:

```tsx
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import NewsPreviewView from './NewsPreviewView'
import {BlockProps} from './types'

export default function NewsPreview({block}: BlockProps<'newsPreview'>) {
  return (
    <NewsPreviewView
      heading={block.heading}
      articles={(block.articles ?? []).slice(0, block.count ?? 2)}
      cta={{
        heading: block.ctaHeading,
        label: block.ctaLabel,
        href: realHref(block.ctaLink ? linkResolver(block.ctaLink as DereferencedLink) : null),
      }}
    />
  )
}
```

- [ ] **Step 4: Gate and commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build`.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: give articles a body and send news tiles to the article page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The article page

**Files:**
- Create: `frontend/components/ArticleView.tsx`, `frontend/components/ShareLinks.tsx`, `frontend/app/news/[slug]/page.tsx`
- Modify: `frontend/components/PortableText.tsx`, `frontend/css/ui.css`

**Interfaces:**
- Consumes: `articleQuery`, `moreNewsQuery`, `articleSlugs` (Task 3); `NewsPreviewView`; `shareUrl`, `LinkAltIcon`, `FacebookIcon`, `LinkedInIcon`; `Tag`; `formatDate`; `resolveOpenGraphImage`.
- Produces: `CustomPortableText` `variant='article'`; `ArticleView({article})` typed from `ArticleQueryResult`; the route `/news/[slug]`.

- [ ] **Step 1: Read the docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` and `.../generate-static-params` (and `generateMetadata`) pages.

- [ ] **Step 2: The `article` rich-text variant**

In `PortableText.tsx`: widen `variant` to `'prose' | 'basic' | 'article'`; in the wrapper `className`, add the third case `variant === 'article' ? \`rich-text-article ${className ?? ''}\``; and in the `image` renderer use the article sizing:

```tsx
      image: ({value}) => {
        if (!value?.asset?._ref) {
          return null
        }
        const isArticle = variant === 'article'
        return (
          <figure className={isArticle ? '' : 'my-8'}>
            <Image
              id={value.asset._ref}
              alt={value.alt || ''}
              width={isArticle ? 1640 : 672}
              sizes={isArticle ? '(min-width: 820px) 820px, 100vw' : undefined}
              crop={value.crop}
              mode="cover"
              className={isArticle ? 'h-[362px] w-full rounded object-cover' : 'rounded-sm'}
            />
          </figure>
        )
      },
```

Append to `frontend/css/ui.css`:

```css
/* Article body (Figma news template, 1910:14865): body text, 20px between paragraphs, 40px around
   an image, headings from the headline scale. */
.rich-text-article {
  color: var(--color-on-background);
  font-family: var(--font-sans);
  font-size: var(--text-body-base);
  line-height: 1.6;
}

.rich-text-article > * + * {
  margin-top: 1.25rem;
}

.rich-text-article > figure {
  margin-block: 2.5rem;
}

.rich-text-article > :first-child {
  margin-top: 0;
}

.rich-text-article > h3,
.rich-text-article > h4,
.rich-text-article > h5,
.rich-text-article > h6 {
  margin-top: 2.5rem;
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.rich-text-article > h3 {
  font-size: var(--text-headline-lg);
}

.rich-text-article > h4 {
  font-size: var(--text-headline-base);
}

.rich-text-article > h5,
.rich-text-article > h6 {
  font-size: var(--text-headline-sm);
}

.rich-text-article a:not(.link-item--inactive) {
  text-decoration: underline;
}

.rich-text-article ul,
.rich-text-article ol {
  padding-left: 1.5rem;
}

.rich-text-article ul {
  list-style: disc;
}

.rich-text-article ol {
  list-style: decimal;
}

.article-curve {
  background: url('/images/blocks/article-curve.svg') center / 100% 100% no-repeat;
}
```

- [ ] **Step 3: The Share row**

`frontend/components/ShareLinks.tsx`:

```tsx
'use client'

import {useState} from 'react'

import {FacebookIcon, LinkAltIcon, LinkedInIcon} from '@/components/icons'
import {shareUrl, type ShareNetwork} from '@/sanity/lib/share'

const BUTTON =
  'flex size-8 items-center justify-center rounded text-on-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500'

/**
 * The Share row (Figma: Share, with link, Facebook and LinkedIn). Instagram has no web share
 * address, so it is left out. Everything reads the current address in the browser when clicked, so
 * nothing is computed on the server and no site URL setting is needed.
 */
export default function ShareLinks() {
  const [status, setStatus] = useState('')

  function share(network: ShareNetwork) {
    const url = shareUrl(network, window.location.href)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('Link copied')
    } catch {
      // No clipboard (an insecure context) or the browser refused.
      setStatus('Could not copy the link')
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-center font-mono text-body-base leading-[1.6] text-on-background">Share</p>
      <div className="flex items-center gap-4">
        <button type="button" onClick={copy} aria-label="Copy link" className={BUTTON}>
          <LinkAltIcon className="size-6" />
        </button>
        <button type="button" onClick={() => share('facebook')} aria-label="Share on Facebook" className={BUTTON}>
          <FacebookIcon className="size-[29px]" />
        </button>
        <button type="button" onClick={() => share('linkedin')} aria-label="Share on LinkedIn" className={BUTTON}>
          <LinkedInIcon className="size-[29px]" />
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={status ? 'font-sans text-body-small text-on-background-subtle' : 'sr-only'}
      >
        {status}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: `ArticleView`**

`frontend/components/ArticleView.tsx` (Figma `1910:14865`):

```tsx
import type {PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import ShareLinks from '@/components/ShareLinks'
import Tag from '@/components/ui/Tag'
import {formatDate} from '@/sanity/lib/dates'
import type {ArticleQueryResult} from '@/sanity.types'

/**
 * A news article (Figma: news_content_desktop). Everything but the title is optional and simply
 * absent when missing: a category that was unpublished dereferences to null.
 */
export default function ArticleView({article}: {article: NonNullable<ArticleQueryResult>}) {
  const categories = (article.categories ?? []).flatMap((c) => (c?.title ? [{key: c.slug ?? c.title, label: c.title}] : []))
  const date = formatDate(article.date)

  return (
    <article className="relative flex w-full flex-col items-center overflow-clip bg-background tf-px py-24">
      <div
        className="article-curve pointer-events-none absolute left-0 top-[332px] h-[1110px] w-[1840px] max-w-none"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-[820px] flex-col items-start gap-16">
        <p className="whitespace-nowrap font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
          Nantucket News
        </p>
        <div className="flex w-full flex-col items-start gap-10">
          <div className="flex w-full flex-col items-start gap-3">
            <h1 className="w-full text-headline-xl text-on-background">{article.title}</h1>
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {categories.map((category) => (
                  <Tag key={category.key} label={category.label} />
                ))}
              </div>
            )}
            {date && (
              <p className="font-sans text-body-large leading-[1.6] text-on-background-subtle">
                Published: {date}
              </p>
            )}
          </div>
          <hr className="w-full border-0 border-t border-dusty-heath-700" />
          {article.body && article.body.length > 0 && (
            <CustomPortableText
              variant="article"
              className="w-full"
              value={article.body as PortableTextBlock[]}
            />
          )}
        </div>
        <ShareLinks />
      </div>
    </article>
  )
}
```

- [ ] **Step 5: The route**

`frontend/app/news/[slug]/page.tsx`:

```tsx
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import ArticleView from '@/components/ArticleView'
import NewsPreviewView from '@/components/blocks/NewsPreviewView'
import {sanityFetch} from '@/sanity/lib/live'
import {articleQuery, articleSlugs, moreNewsQuery} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * A news article page, /news/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /news (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: articleSlugs,
    // Only published articles are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((article) => (article.slug ? [{slug: article.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/news/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: article} = await sanityFetch({query: articleQuery, params: {slug}, stega: false})
  if (!article) return {}
  const description = article.body?.length
    ? toPlainText(article.body as PortableTextBlock[]).slice(0, 160)
    : undefined
  const image = resolveOpenGraphImage(article.image)
  return {
    title: article.title,
    description,
    openGraph: image ? {images: [image]} : undefined,
  } satisfies Metadata
}

export default async function NewsArticlePage(props: PageProps<'/news/[slug]'>) {
  const {slug} = await props.params
  const [{data: article}, {data: more}] = await Promise.all([
    sanityFetch({query: articleQuery, params: {slug}}),
    sanityFetch({query: moreNewsQuery, params: {slug}}),
  ])

  // No article at this slug: a real 404, never a 200 placeholder.
  if (!article?._id) notFound()

  return (
    <>
      <ArticleView article={article} />
      {/* No call to action tile: its destination, the news archive, does not exist yet (#11). */}
      <NewsPreviewView heading="Nantucket News" articles={more} cta={null} />
    </>
  )
}
```

`resolveOpenGraphImage` takes a `SanityImageSource`; if `article.image` does not type-check against it, cast through the generated image type, do not use `any`.

- [ ] **Step 6: Gate, build, commit**

Run the gate commands (separately), then `cd frontend && NODE_ENV=production npx next build 2>&1 | tail -25`.
Expected: all pass; the route table lists `/news/[slug]` (SSG when any published article exists, otherwise dynamic) and `/[...slug]` is unchanged.

```bash
git add -A frontend
git commit -m "feat: add the news article page and its share row

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Presentation, sitemap, sample content, docs and final verification

**Files:**
- Modify: `studio/sanity.config.ts`, `frontend/app/sitemap.ts`, `studio/scripts/seedPhaseBContent.ts`, `studio/scripts/seedBlockGallery.ts`, `docs/DECISIONS.md`

- [ ] **Step 1: Presentation, both directions**

In `studio/sanity.config.ts`, add a route to `mainDocuments` **before** `...PAGE_PRESENTATION_ROUTES` (so the specific `/news/:slug` is tried before the generic two-segment page route):

```ts
          // A news article page. Listed before the page routes: /news/<slug> also fits their
          // two-segment pattern, and the more specific route must be tried first.
          {
            route: '/news/:slug',
            filter: `_type == "article" && slug.current == $slug`,
          },
```

and add to `locations`:

```ts
          article: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.title || 'Untitled', href: `/news/${doc.slug}`}]
                : [],
              message: doc?.slug ? undefined : 'Add a slug to preview this article.',
            }),
          }),
```

Run `cd studio && npx tsc --noEmit`, then the page-routing contract check (read-only against the dataset): `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token`. Expected: it passes as before (page routes are unchanged).

- [ ] **Step 2: Sitemap**

In `frontend/app/sitemap.ts` import `articleSitemapData`, fetch it beside `sitemapData`, and after the pages loop add:

```ts
  const articles = await sanityFetch({query: articleSitemapData})
  for (const article of articles.data) {
    if (!article.slug) continue
    sitemap.push({
      lastModified: article._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/news/${article.slug}`,
    })
  }
```

- [ ] **Step 3: Sample content with bodies**

In `studio/scripts/seedPhaseBContent.ts`, give each of the three `article` documents a `body`: a paragraph, an `image` block (use that article's own uploaded image asset with `alt`), then two paragraphs (`text(...)` already exists in the script). Add a note to the script header: existing articles are skipped, so a gallery/article already seeded without a body keeps none; add one in Studio or remove the draft and re-run. `cd studio && npx tsc --noEmit && npx sanity exec scripts/seedPhaseBContent.ts --with-user-token -- --dry`. Expected: the dry run lists nothing new if the documents exist.

In `seedBlockGallery.ts`, replace the Map Teaser entries: the populated one gets `eyebrow`, `heading`, `body`, a `button` (`buttonText: 'View the map'`, link `/map`) and, when the dataset has a project, `featuredProject` (look one up with `*[_type == "project"][0]._id`; skip the field when none). Add an empty-state `{_type: 'mapTeaser', _key: key()}` and one with a button whose link is `{_type: 'link', linkType: 'page'}` (no page: the button must not render). Run `cd studio && npx tsc --noEmit && npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry`.

Writing to the dataset is for the user to confirm in chat; do not run the non-dry seeds without it.

- [ ] **Step 4: Record decisions and update issues**

Append `## 10. News article pages and the map teaser` to `docs/DECISIONS.md` (the existing "Status / Why / Implication" format) covering: articles live at `/news/<slug>` as a static route, so a CMS page cannot sit beneath `/news` (the archive at `/news` itself is fine); tiles go to `link` when it resolves, else the article page; the Share row (copy, Facebook, LinkedIn; Instagram left out because it has no web share address); the "more news" section has no CTA tile until the archive exists; the Map Teaser is artwork with a featured project, not a live map; and the position-to-percentage conversion is an assumption to compare in Presentation ([#15](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/15)).

```bash
gh issue comment 13 --body "The map teaser is rebuilt to the Figma Interactive Map Block (static map artwork, a featured property card, a button). A live Mapbox preview inside the teaser was not built; close this if the artwork is enough, or reopen as a follow-up."
gh issue comment 11 --body "Article pages now exist at /news/<slug> (rich-text body, share row, more news). Still here: the news archive, filters, pagination, and the call to action tile under 'more news'."
gh issue comment 15 --body "Also compare against Figma: the news article page (node 1910:14863) and the Map Teaser (node 1910:9569), including the map panel's percentage-based positions below and above 768px, and that Presentation resolves /news/<slug> to the article."
```

- [ ] **Step 5: Final verification**

Run the gate commands (separately) and `NODE_ENV=production npx next build`. Confirm no dev server is running. Commit:

```bash
git add -A docs studio frontend sanity.schema.json
git commit -m "feat: resolve articles in Presentation and the sitemap, extend the samples

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** route, 404, layout, body, tags, date, rule, Share row (copy, Facebook, LinkedIn), more news without a CTA, metadata and OG image, sitemap and Presentation (Tasks 3-5); `article.body`, the optional link override and the tile destination rule (Task 3); Map Teaser fields, featured project card, button, static art (Task 2); assets and the command block (Task 1); deferred items stay deferred.
- **Names checked across tasks:** `shareUrl`/`ShareNetwork` (Task 1) used by `ShareLinks` (Task 4); `articleCardFields`, `articleQuery`, `moreNewsQuery`, `articleSlugs`, `articleSitemapData` (Task 3) used by Tasks 4-5; `NewsPreviewView({heading, articles, cta})` (Task 3) used by the block and the page; `ButtonLink.rightIcon` (Task 2); `variant='article'` (Task 4).
- **Instructions that are not code:** three `{/* … */}` lines in `NewsPreviewView` (move the existing tile bodies), the pin comment in `MapTeaser`, and the `LinkAltIcon` path comment are explicit step instructions to replace; leaving any behind is a defect.
- **Judgement calls an executor may hit:** the pin artwork may need the mask composition (Task 2 Step 1); `resolveOpenGraphImage` may need a typed cast; the Presentation route order is verified only by the user in Studio (#15); the existing seeded articles have no body, so the page shows their title, tags, date and the share row only until a body is added.
