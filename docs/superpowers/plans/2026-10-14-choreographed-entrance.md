# Choreographed entrance and inside-block stagger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block parts stagger in on scroll, and the header plus first block's text play a short entrance on page load, without hurting LCP or CLS.

**Architecture:** `RevealObserver` additionally detects each block's parts and tags them with `data-reveal-part` and `--reveal-index`; CSS keyframe animations do the motion. The page-load entrance is CSS-only, hooked by `data-entrance` (first block), `data-eyebrow` and the existing `data-header-bar`. Nothing needs JS to play on first paint.

**Tech Stack:** Next 16 App Router, React 19, Tailwind 4, plain CSS in `frontend/css/ui.css`. No animation library.

**Spec:** `docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md` (builds on `2026-10-14-scroll-reveal-animations-design.md`)

## Global Constraints

- Only `opacity`, `translate` and `transform` change; no layout properties; no idle `will-change`.
- Parts use the individual `translate` property and a keyframe `animation` with `backwards` fill, never a `transition`, so a part's own hover/focus transitions are untouched.
- Scroll stagger: 32px rise, 700ms, 90ms between parts, ease `--motion-ease-out`. Max 8 parts per block, DOM order.
- Entrance: header bar `translate` only (-12px, 500ms), never opacity. First-block text rise 24px, 600ms; delays eyebrow 0ms, `h1`/`h2`/`h3` 100ms, `p`/`ul`/`ol` 200ms, buttons/links 300ms. Media is never animated.
- Hidden states exist only under `.js-reveal`; entrance runs on server-rendered markup with no JS.
- `prefers-reduced-motion: reduce` and `print` show everything with no motion.
- Entrance is off in draft mode (`html[data-draft]`).
- Excluded from part detection: `.splide`, `.mapboxgl-map`, `form`, `[data-reveal-skip]`.
- Before any Next.js code, read the relevant doc in `node_modules/next/dist/docs/` (AGENTS.md).

## Review Focus

- A block already in the viewport on load must not flash hidden or replay its stagger (instant path).
- Button hover and focus states still work after the part animation finishes.
- A very long archive: only the first 8 parts animate, everything else stays visible, nothing is hidden forever.
- A block with no detectable parts falls back to the whole-block rise instead of staying invisible.
- Parts inside a carousel, the map or a form are never hidden or animated.
- The sticky header still hides and shows on scroll after the entrance `translate`.
- LCP does not regress against the baseline captured in Task 2 Step 1.

---

### Task 1: Markup hooks

**Files:**
- Modify: `frontend/components/blocks/Eyebrow.tsx`
- Modify: `frontend/components/BlockRenderer.tsx` (the wrapper `<div>`, next to `data-reveal`)
- Modify: `frontend/app/layout.tsx` (`<html>` tag)

**Interfaces:**
- Produces: attribute contract `data-eyebrow` (on the eyebrow `<p>`), `data-entrance` (first block wrapper, `index === 0`), `data-draft` (on `<html>` in draft mode).

- [ ] **Step 1: Eyebrow**

Change the returned element in `Eyebrow.tsx` to:

```tsx
return (
  <p data-eyebrow className={`font-mono uppercase tracking-wide text-sm ${className}`}>
    {children}
  </p>
)
```

- [ ] **Step 2: BlockRenderer**

In the wrapper `<div>`, directly after the existing `data-reveal={index > 0 ? '' : undefined}` line, add:

```tsx
data-entrance={index === 0 ? '' : undefined}
```

- [ ] **Step 3: Layout**

On the `<html>` element add `data-draft={isDraftMode ? '' : undefined}` (alongside `lang` and `className`).

- [ ] **Step 4: Check**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: no errors (the one pre-existing `Script` unused-var warning in `layout.tsx` is expected).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/blocks/Eyebrow.tsx frontend/components/BlockRenderer.tsx frontend/app/layout.tsx
git commit -m "feat: markup hooks for choreographed entrance

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Page-load entrance (CSS-only)

**Files:**
- Modify: `frontend/css/ui.css` (append after the existing "Scroll reveal" section; extend the existing reduced-motion/print block)

**Interfaces:**
- Consumes: `data-header-bar` (already on the header bar in `Header.tsx`), `data-entrance`, `data-eyebrow`, `html[data-draft]` from Task 1.
- Produces: tokens `--motion-entrance-*`.

- [ ] **Step 1: Capture the baseline BEFORE any CSS change**

With the dev server running (`preview_start` name `frontend`), load `/` in a 1280x800 viewport. A hidden Browser pane does not tick frames, so take a screenshot after loading to force a frame. In `javascript_tool`:

```js
window.__cls = 0
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({type: 'layout-shift', buffered: true})
new PerformanceObserver((l) => { const e = l.getEntries().pop(); window.__lcp = {t: Math.round(e.startTime), tag: e.element && e.element.tagName} }).observe({type: 'largest-contentful-paint', buffered: true})
```

Reload, screenshot, wait 800ms, then read `({cls: window.__cls, lcp: window.__lcp})`. Do this for `/` and for one inner page such as `/about-us/conservation`. Record all four numbers in the ledger as the baseline. (Dev-mode LCP is slow in absolute terms; only the before/after comparison matters.)

- [ ] **Step 2: Append the entrance CSS**

```css

/* ---- Page-load entrance ---------------------------------------------------------------------------
   CSS-only, so it plays at first paint with no wait for hydration. The header slides with
   `translate` alone (never opacity) so the logo cannot delay LCP. The first block's text rises in
   order of element type, because no index exists before JS runs. Media is never animated. */
:root {
  --motion-entrance-header-distance: -12px;
  --motion-entrance-header-duration: 500ms;
  --motion-entrance-text-distance: 24px;
  --motion-entrance-text-duration: 600ms;
}

@keyframes entrance-header {
  from {
    translate: 0 var(--motion-entrance-header-distance);
  }
  to {
    translate: 0 0;
  }
}

@keyframes entrance-text {
  from {
    opacity: 0;
    translate: 0 var(--motion-entrance-text-distance);
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

html:not([data-draft]) [data-header-bar] {
  animation: entrance-header var(--motion-entrance-header-duration) var(--motion-ease-out) backwards;
}

html:not([data-draft]) [data-entrance] :is(h1, h2, h3, p, ul, ol, a):not([data-reveal-skip] *) {
  animation: entrance-text var(--motion-entrance-text-duration) var(--motion-ease-out) 200ms backwards;
}
html:not([data-draft]) [data-entrance] [data-eyebrow] {
  animation-delay: 0ms;
}
html:not([data-draft]) [data-entrance] :is(h1, h2, h3) {
  animation-delay: 100ms;
}
/* A link inside a paragraph, heading or list rides with its parent; only standalone links (buttons) get their own beat. */
html:not([data-draft]) [data-entrance] :is(p, h1, h2, h3, li) a {
  animation: none;
}
html:not([data-draft]) [data-entrance] a:not(:is(p, h1, h2, h3, li) a) {
  animation-delay: 300ms;
}

@media (prefers-reduced-motion: reduce), print {
  [data-header-bar],
  [data-entrance] :is(h1, h2, h3, p, ul, ol, a) {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Verify the entrance**

Reload `/` (screenshot to force frames). In `javascript_tool` read, for the header bar, the eyebrow, the first `h1`/`h2` and the first `p` inside `[data-entrance]`: `getComputedStyle(el).animationName` and `animationDelay`.
Expected: `entrance-header` on the bar; `entrance-text` on the text with delays `0s`, `0.1s`, `0.2s`; a media element (`img`, `video`) inside `[data-entrance]` has `animationName` `none`.

Also confirm the first block's text is fully visible after ~1.5s (opacity 1, translate `none`/`0px`) and that the sticky header still hides on scroll down and shows on scroll up.

- [ ] **Step 4: Compare LCP and CLS to the Step 1 baseline**

Repeat the measurement on the same two pages. Expected: CLS about 0 (under 0.001), LCP element unchanged and its time within noise of the baseline. If LCP moved later by more than noise, shorten the first-block text delays in Step 2, and if it still regresses, delete the `[data-entrance]` text rules and keep the header slide. Ledger any such change as a ruling.

- [ ] **Step 5: Check and commit**

Run: `cd frontend && npm run lint`
Expected: no new errors.

```bash
git add frontend/css/ui.css
git commit -m "feat: CSS-only page-load entrance (header slide, first-block text)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Inside-block stagger

**Files:**
- Modify: `frontend/components/RevealObserver.tsx` (replace whole file)
- Modify: `frontend/css/ui.css` (the existing "Scroll reveal" section and its reduced-motion/print block)

**Interfaces:**
- Consumes: the existing observer contract (`data-reveal`, `data-revealed`, `js-reveal`).
- Produces: `data-reveal-part` and `--reveal-index` on parts, `data-reveal-staggered` on a block that has parts, `data-reveal-instant` on a block shown immediately at load.

- [ ] **Step 1: Baseline the failure (RED)**

On `/` after loading, in `javascript_tool`: `document.querySelectorAll('[data-reveal-part]').length`.
Expected now: `0`.

- [ ] **Step 2: Replace `RevealObserver.tsx`**

```tsx
'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

const PART_SELECTOR = 'h1, h2, h3, h4, p, figure, img, video, blockquote, ul, ol, [data-reveal-part]'
const SKIP_SELECTOR = '.splide, .mapboxgl-map, form, [data-reveal-skip]'
const MAX_PARTS = 8

/** Anything whose top edge is above the bottom of the viewport is on screen or already scrolled past. */
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}

/**
 * The elements of a block that arrive one after another: headings, copy, media. Backgrounds and
 * decorative art are not candidates, so they stay still while the content staggers over them.
 * querySelectorAll is in document order (parents before children), so skipping anything an earlier
 * part contains collapses nested matches to the outermost. Capped so a long archive staggers only
 * its first screen.
 */
function pickParts(block: HTMLElement): HTMLElement[] {
  const parts: HTMLElement[] = []
  for (const el of block.querySelectorAll<HTMLElement>(PART_SELECTOR)) {
    if (parts.length >= MAX_PARTS) break
    if (el.closest(SKIP_SELECTOR)) continue
    if (parts.some((part) => part.contains(el))) continue
    parts.push(el)
  }
  return parts
}

/** Tag a block's parts once. A block with no parts keeps today's whole-block rise. */
function markParts(block: HTMLElement) {
  if (block.hasAttribute('data-reveal-staggered')) return
  const parts = pickParts(block)
  if (parts.length === 0) return
  parts.forEach((part, index) => {
    part.setAttribute('data-reveal-part', '')
    part.style.setProperty('--reveal-index', String(index))
  })
  block.setAttribute('data-reveal-staggered', '')
}

/**
 * Show an element with no transition or stagger. A block inserted after `js-reveal` is on <html>
 * (client navigation, a live-content refresh) is already styled hidden, so without this it would
 * animate in from hidden even though it is on screen.
 */
function revealInstantly(el: HTMLElement) {
  el.setAttribute('data-reveal-instant', '')
  el.style.transition = 'none'
  el.setAttribute('data-revealed', '')
  void el.offsetHeight // commit the un-transitioned state
  requestAnimationFrame(() => {
    el.style.transition = ''
  })
}

/**
 * Drives the scroll-reveal motion defined in css/ui.css. Renders nothing.
 *
 * Blocks opt in with [data-reveal]. Content already in the viewport is shown immediately (no
 * animation, no hidden frame); everything below the fold is revealed once, as it scrolls into
 * view, with the block's parts staggered. A MutationObserver picks up blocks that appear or
 * change after mount, so nothing is left hidden and unobserved. Pass `disabled` in draft mode so
 * editors always see content.
 */
export default function RevealObserver({disabled = false}: {disabled?: boolean}) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    if (disabled || typeof IntersectionObserver === 'undefined') {
      root.classList.remove('js-reveal')
      return
    }

    // threshold 0: any overlap with the root reveals. A ratio threshold can never be met by a block
    // taller than the root divided by that ratio, which would leave a long archive hidden forever.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      {rootMargin: '0px 0px -15% 0px', threshold: 0},
    )

    const watching = new WeakSet<Element>()
    const process = () => {
      const pending = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
      for (const el of pending) {
        if (watching.has(el)) continue
        markParts(el) // before js-reveal is added, so a part is never hidden before its block is ready
        if (shouldShowNow(el)) {
          revealInstantly(el)
        } else {
          watching.add(el)
          observer.observe(el)
        }
      }
      root.classList.add('js-reveal')
    }

    // Runs before first paint, so only scroll-triggered blocks ever animate.
    process()

    const mutations = new MutationObserver(process)
    mutations.observe(document.getElementById('pageMain') ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-reveal'],
    })

    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [pathname, disabled])

  return null
}
```

- [ ] **Step 3: Stagger CSS**

In `ui.css`, add tokens to the existing `:root` block of the "Scroll reveal" section:

```css
  --motion-part-distance: 32px;
  --motion-part-duration: 700ms;
  --motion-part-stagger: 90ms;
```

Then, after the existing `.js-reveal [data-reveal]:not([data-revealed])` rule, add (order matters: the staggered override must come after it):

```css
/* A block with parts does not rise as a slab: the wrapper stays put and each part moves instead. */
.js-reveal [data-reveal-staggered]:not([data-revealed]) {
  opacity: 1;
  transform: none;
}

.js-reveal [data-reveal]:not([data-revealed]) [data-reveal-part] {
  opacity: 0;
  translate: 0 var(--motion-part-distance);
}

/* An animation with backwards fill, not a transition: it holds the first keyframe through the
   delay, then releases the element, so a part's own hover and focus transitions are untouched. */
@keyframes reveal-part {
  from {
    opacity: 0;
    translate: 0 var(--motion-part-distance);
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

[data-revealed] [data-reveal-part] {
  animation: reveal-part var(--motion-part-duration) var(--motion-ease-out)
    calc(var(--reveal-index, 0) * var(--motion-part-stagger)) backwards;
}

/* On screen at load: shown, not animated. */
[data-reveal-instant] [data-reveal-part] {
  animation: none;
}
```

And extend the existing `@media (prefers-reduced-motion: reduce), print` block (the one that already resets `[data-reveal]`) with:

```css
  [data-reveal-part] {
    opacity: 1 !important;
    translate: none !important;
    animation: none !important;
  }
```

- [ ] **Step 4: Verify (GREEN) on `/`**

Reload at 1280x800 (screenshot to force a frame).
- `document.querySelectorAll('[data-reveal-part]').length` is now greater than `0` (RED was `0`).
- A below-the-fold block has `data-reveal-staggered`, its wrapper has opacity `1`, and its parts have computed opacity `0` and `translate` `0px 32px`.
- Scroll that block into view, screenshot, and sample a part mid-animation: opacity strictly between 0 and 1. Parts later in the block (higher `--reveal-index`) lag earlier ones. After ~2s all are opacity `1`, `translate` `none`.
- A block in view at load has `data-reveal-instant` and its parts never animated.

- [ ] **Step 5: Review Focus checks**

- **Hover:** on a block button revealed by scroll, after 2s, hover it and confirm its computed `transition` and hover style still apply (compare against a button that was never animated).
- **Tall block:** inject a block with 40 `<p>` children and `data-reveal` into `#pageMain`; only the first 8 get `data-reveal-part`; the other 32 are visible (opacity `1`) at all times; the block reveals when scrolled to.
- **No parts:** inject a `data-reveal` block containing only an empty `div` with a background; it is not `data-reveal-staggered`, hides via the wrapper, and reveals via the whole-block rise.
- **Skipped regions:** a `p` inside `.splide`, `form` or `[data-reveal-skip]` inside a block gets no `data-reveal-part`.
- **Late block:** insert a `data-reveal` block with headings after load; it is detected, marked, and shown instantly if on screen.

- [ ] **Step 6: Check and commit**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`
Expected: pass; no generated-file changes.

```bash
git add frontend/components/RevealObserver.tsx frontend/css/ui.css
git commit -m "feat: stagger a block's parts as it scrolls into view

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Whole-site pass

**Files:** none unless a defect is found (then fix in the files above).

- [ ] **Step 1: Walk the main block types.** On a page using each of these, scroll through and look for awkward staggering or a part that should stay still: hero variants, `basicLeftRightText`, `missionStatement`, `ctaContact`, `peopleGrid`/`staffGrid`, `propertyArchive`, `recordsArchive`, `newsPreview`, `faqList`, `timeline`, `mapTeaser`/`mapExplorer`. Where a part animates wrongly, add `data-reveal-skip` to the relevant wrapper in that block's component and ledger it.
- [ ] **Step 2: Carousel, timeline, map.** They still scroll, drag and render; none of their inner parts are hidden or animated.
- [ ] **Step 3: Client-side navigation.** Click through to another page: the first block's entrance plays, below-fold blocks stagger on scroll, no hidden frame for blocks already in view.
- [ ] **Step 4: Guardrails.** With reduced motion emulated (Playwright `browser_emulate_media` `reducedMotion: reduce`), all parts and the entrance show with no motion. In print emulation, everything is visible. In draft mode, no entrance animation and no hidden parts (`html[data-draft]` present, `js-reveal` absent).
- [ ] **Step 5: Final LCP/CLS.** Repeat the Task 2 measurement on `/` and the inner page; compare to the baseline.
- [ ] **Step 6: Mobile.** At 375x812, the stagger and entrance look right and a long archive (properties) is not hidden.
- [ ] **Step 7: Stop any dev server you started; reset the viewport.**
- [ ] **Step 8: Commit any fixes**

```bash
git add -A frontend
git commit -m "fix: choreography adjustments from the block pass

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Docs and deferred-work issues

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md` (status, deferred issue numbers)
- Modify: `docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md` (note)
- Modify: `docs/design/12-animations.md`

- [ ] **Step 1: Search for duplicates**

Run: `gh issue list --state all --search "view transitions"` and the same for `scroll-scrubbed`, `grid stagger`.

- [ ] **Step 2: File the deferred issues** (skip any that already exist)

```bash
gh issue create --title "Page transitions between routes (experimental viewTransition)" --body "Choreographed entrance covers page-load only. A route-to-route transition (cross-fade, overlay wipe or shared-element morph) is deferred. Next 16 has experimental.viewTransition with React's <ViewTransition>; see node_modules/next/dist/docs/01-app/02-guides/view-transitions.md. Needs a prototype first, and must be checked against scroll-reveal so nothing flashes. Spec: docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md"
gh issue create --title "Scroll-scrubbed motion (parallax, pinned sections) with GSAP ScrollTrigger" --body "Deferred from the choreographed-entrance work. Only justified if a specific scroll-driven effect is designed. Scope to the pages that need it, load dynamically, gate for prefers-reduced-motion. Spec: docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md"
gh issue create --title "Stagger grid and list cards beyond the first 8 parts" --body "Inside-block stagger is capped at 8 parts per block, so cards deeper in long archives (properties, records, people) appear without stagger. Deferred. Approach: tag card items with data-reveal-part and a per-row --reveal-index, or reveal rows as they enter. Spec: docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md"
```

- [ ] **Step 3: Update the specs**

In the choreography spec set `Status: implemented` and add the three new issue numbers to its Deferred section. In the scroll-reveal spec, under Design, add: "Blocks that have parts no longer rise as a slab; their parts stagger instead (see the choreographed-entrance spec). The whole-block rise remains the fallback for blocks with no parts." In `docs/design/12-animations.md` add a link to the choreography spec.

- [ ] **Step 4: Close #51**

```bash
gh issue close 51 --comment "Delivered by the inside-block stagger (docs/superpowers/specs/2026-10-14-choreographed-entrance-design.md), which covers the first 8 parts per block. Stagger for cards beyond that is tracked in a new issue."
```

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: record choreography deferrals and close the stagger issue

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** automatic part detection with exclusions, nesting collapse and cap (Task 3); scroll stagger with animation and `translate` (Task 3); CSS-only entrance for header and first block with type-based delays and excluded media (Tasks 1–2); reduced motion, print, draft and no-JS (Tasks 1–3); verification list including LCP/CLS, hover, tall blocks, map/carousel (Tasks 2–4); deferred issues and #51 (Task 5).
- **Names:** `data-reveal-part`, `data-reveal-staggered`, `data-reveal-instant`, `data-entrance`, `data-eyebrow`, `data-draft`, `--reveal-index` and the `--motion-*` tokens are used consistently across tasks.
- **Plan-found detail not in the spec:** the header's sticky `<header>` already slides via `transform`, so the entrance targets the inner `[data-header-bar]` and uses `translate`; and the eyebrow is a `<p>`, so it gets a `data-eyebrow` hook to separate it from body copy. Neither changes the spec's behaviour.
