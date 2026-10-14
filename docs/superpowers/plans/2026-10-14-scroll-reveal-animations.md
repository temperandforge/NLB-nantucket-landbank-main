# Scroll-reveal animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page-builder blocks fade and rise into view on scroll without hurting LCP, CLS or INP.

**Architecture:** `BlockRenderer` tags each block wrapper with `data-reveal`. One client island, `RevealObserver`, mounted in the root layout, adds `js-reveal` to `<html>` and runs a single `IntersectionObserver` that sets `data-revealed`. All motion is CSS (`opacity` + `transform`).

**Tech Stack:** Next 16 (App Router), React 19, Tailwind 4, plain CSS in `frontend/css/ui.css`. No animation library.

**Spec:** `docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md`

## Global Constraints

- Only `opacity` and `transform` animate; no layout properties; no idle `will-change`.
- Motion: 20px rise, 500ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Observer: `rootMargin: '0px 0px -8% 0px'`, `threshold: 0.1`; each element is unobserved after first reveal.
- Hidden state exists only under `.js-reveal` (no-JS shows everything).
- `prefers-reduced-motion: reduce` shows everything with no motion.
- First block (`index === 0`) never gets `data-reveal`.
- Disabled in draft mode (Studio Presentation / Visual Editing).
- No animation library.
- Before any Next.js code, read the relevant doc in `frontend/node_modules/next/dist/docs/` (AGENTS.md rule) — at least the `usePathname` reference.

## Review Focus

- Block already in the viewport on first load must not animate or flash hidden (initial mark happens before paint).
- Client-side navigation to another page: the new page's below-fold blocks reveal on scroll; in-view ones appear without a hidden frame.
- Page loaded with a `#hash` far down: blocks above/at the target must not stay invisible.
- Very tall block (taller than the viewport): must still reveal (threshold 0.1 of a tall element) — verify, fall back to threshold `0` if it stays hidden.
- Draft mode / Presentation: nothing is ever hidden.

---

### Task 1: Motion CSS

**Files:**
- Modify: `frontend/css/ui.css` (append a new section after the "Mobile menu" block at the end of the file)

**Interfaces:**
- Produces: attribute contract `data-reveal` (element opts in), `data-revealed` (element is shown), `.js-reveal` on `<html>` (enables hidden state). Tokens `--motion-reveal-distance`, `--motion-reveal-duration`, `--motion-ease-out`.

- [ ] **Step 1: Append the CSS**

```css

/* ---- Scroll reveal -------------------------------------------------------------------------------
   Blocks opt in with [data-reveal] (see BlockRenderer). RevealObserver adds .js-reveal to <html>
   and sets [data-revealed] as each block scrolls into view. Without JS the hidden state never
   applies, so content is always visible. Only opacity and transform animate: no layout shift. */
:root {
  --motion-reveal-distance: 20px;
  --motion-reveal-duration: 500ms;
  --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}

[data-reveal] {
  transition:
    opacity var(--motion-reveal-duration) var(--motion-ease-out),
    transform var(--motion-reveal-duration) var(--motion-ease-out);
}

.js-reveal [data-reveal]:not([data-revealed]) {
  opacity: 0;
  transform: translateY(var(--motion-reveal-distance));
}

@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    transition: none;
  }
  .js-reveal [data-reveal]:not([data-revealed]) {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/css/ui.css
git commit -m "feat: scroll-reveal CSS and motion tokens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: RevealObserver client island

**Files:**
- Create: `frontend/components/RevealObserver.tsx`

**Interfaces:**
- Consumes: the attribute contract from Task 1.
- Produces: `export default function RevealObserver({disabled}: {disabled?: boolean}): null`

- [ ] **Step 1: Read the docs**

Read the `usePathname` page under `frontend/node_modules/next/dist/docs/` (find with `grep -rl usePathname frontend/node_modules/next/dist/docs | head`).

- [ ] **Step 2: Write the component**

```tsx
'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

const HIDDEN = ':not([data-revealed])'

function inViewport(el: Element) {
  const rect = el.getBoundingClientRect()
  return rect.top < window.innerHeight && rect.bottom > 0
}

/** Show an element with no transition, for content already on screen. */
function revealInstantly(el: HTMLElement) {
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
 * animation, no hidden frame); everything else is revealed once, as it scrolls into view. Pass
 * `disabled` in draft mode so editors always see content.
 */
export default function RevealObserver({disabled = false}: {disabled?: boolean}) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (disabled || typeof IntersectionObserver === 'undefined') return

    const root = document.documentElement
    const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-reveal]${HIDDEN}`))

    // Runs before first paint: anything on screen is shown now, so only scroll-triggered blocks animate.
    const offscreen: HTMLElement[] = []
    for (const el of targets) {
      if (inViewport(el)) revealInstantly(el)
      else offscreen.push(el)
    }
    root.classList.add('js-reveal')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      {rootMargin: '0px 0px -8% 0px', threshold: 0.1},
    )
    offscreen.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [pathname, disabled])

  return null
}
```

Notes for the implementer: blocks above the viewport after a hash jump have `rect.bottom <= 0`, so `inViewport` is false and the observer would only fire if they re-enter. Handle that in Step 3.

- [ ] **Step 3: Reveal blocks already scrolled past**

In the loop, treat `rect.bottom <= 0` (above the viewport) as revealed too. Replace `inViewport` with:

```tsx
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}
```

and use `shouldShowNow(el)` in the loop. Anything whose top is above the fold bottom is shown immediately; only blocks below the fold are observed.

- [ ] **Step 4: Type-check and lint**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/RevealObserver.tsx
git commit -m "feat: RevealObserver client island for scroll reveal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Wire into BlockRenderer and layout

**Files:**
- Modify: `frontend/components/BlockRenderer.tsx` (the wrapper `<div>` in `BlockRenderer`)
- Modify: `frontend/app/layout.tsx` (import, and mount next to `<SanityLive …/>`)

**Interfaces:**
- Consumes: `RevealObserver({disabled})` from Task 2.

Note: `BlockRenderer` is imported by the `'use client'` `PageBuilder`, so it renders on the client; it cannot call `draftMode()`. Draft-mode gating therefore lives in the layout via `RevealObserver`'s `disabled` prop (no `js-reveal` class means `data-reveal` is inert).

- [ ] **Step 1: Tag the wrapper**

In `BlockRenderer`, add to the wrapper `<div>`:

```tsx
data-reveal={index > 0 ? '' : undefined}
```

(alongside the existing `className` and `data-sanity` props).

- [ ] **Step 2: Mount the observer**

In `app/layout.tsx`, add `import RevealObserver from '@/components/RevealObserver'` with the other component imports, and render directly after `<SanityLive onError={handleError} />`:

```tsx
<RevealObserver disabled={isDraftMode} />
```

- [ ] **Step 3: Type-check and lint**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`
Expected: PASS; `git status` shows no generated-file changes (no schema change).

- [ ] **Step 4: Commit**

```bash
git add frontend/components/BlockRenderer.tsx frontend/app/layout.tsx
git commit -m "feat: reveal blocks on scroll

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Browser verification

**Files:** none (fix any defects in Tasks 1–3 files).

No test framework exists; verify in the browser per AGENTS.md. Check what is already running on the dev port before starting a server, and stop only the one you started.

- [ ] **Step 1: Start the dev server** with `preview_start` (name from `.claude/launch.json`) and open a multi-block page (e.g. the homepage).
- [ ] **Step 2: Load behaviour.** Reload; above-the-fold blocks appear with no animation and no blank flash. Scroll: below-fold blocks fade and rise once. Scroll back up: they do not re-animate.
- [ ] **Step 3: Tall block.** Confirm a block taller than the viewport reveals. If not, change `threshold` to `0` in `RevealObserver.tsx`.
- [ ] **Step 4: Hash jump.** Load a URL with a `#fragment` low on the page; blocks above and at the target are visible.
- [ ] **Step 5: Navigation.** Click through to another page via a header link; its below-fold blocks reveal on scroll and in-view blocks show with no hidden frame.
- [ ] **Step 6: Reduced motion.** Emulate `prefers-reduced-motion: reduce` (`resize_window` colorScheme isn't enough; use `javascript_tool` to confirm the media query, or DevTools emulation): all blocks visible, no transition.
- [ ] **Step 7: No JS.** With `javascript_tool`, confirm `document.documentElement.classList.contains('js-reveal')` is true normally; then confirm via CSS inspection that `.js-reveal` is the only selector hiding blocks (so no class means visible).
- [ ] **Step 8: CLS and LCP.** In the page, measure with `PerformanceObserver` (`layout-shift`, `largest-contentful-paint`) via `javascript_tool`; CLS from reveal must be 0 and LCP must not be a revealed block (first block is never hidden). Compare against `main` if practical.
- [ ] **Step 9: Draft mode.** Open the page with draft mode enabled (`/api/draft-mode/enable` flow used by Presentation); confirm `js-reveal` is absent and all blocks are visible.
- [ ] **Step 10: Stop the dev server you started.**
- [ ] **Step 11: Commit any fixes**

```bash
git add -A && git commit -m "fix: scroll-reveal verification fixes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Deferred-work issues and docs

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md` (Deferred section; correct the "Seam" note)
- Modify: `docs/design/12-animations.md` (replace the stub with a short pointer to the spec)

- [ ] **Step 1: Search for duplicates**

Run: `gh issue list --search "scroll reveal" --state all`

- [ ] **Step 2: File the two issues**

```bash
gh issue create --title "Scroll reveal: per-card stagger inside grids" --body "Scroll-reveal currently animates whole blocks only. Grid/list blocks (ProjectGrid, PeopleGrid, StaffGrid, NewsList, ...) could stagger their cards. Deferred to keep the first release minimal. See docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md. Approach: add data-reveal-stagger children styled with a --reveal-index CSS variable; RevealObserver needs no change."
gh issue create --title "Scroll reveal: per-block opt-out field in Sanity" --body "Editors cannot disable scroll-reveal for a specific block. Deferred as YAGNI. See docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md. Approach: a boolean on the page-builder block types; BlockRenderer omits data-reveal when set; run npm run sanity:typegen and commit generated files."
```

- [ ] **Step 3: Update the spec**

Add the issue numbers to its Deferred section. In its Design section, change "`BlockRenderer` stays a server component" wording if present, and state that `BlockRenderer` renders on the client (imported by the `'use client'` `PageBuilder`) and that draft-mode gating is done by `RevealObserver`'s `disabled` prop, not by omitting `data-reveal`. Set Status to implemented.

- [ ] **Step 4: Replace `docs/design/12-animations.md`** with:

```markdown
# Animations

Scroll-reveal for page-builder blocks: see
[docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md](../superpowers/specs/2026-10-14-scroll-reveal-animations-design.md).
```

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: record scroll-reveal deferrals and design pointer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** seam + first-block exclusion (Task 3), client island with shared observer, unobserve, pathname re-run, instant reveal for in-view content (Task 2), CSS + tokens + reduced motion (Task 1), draft-mode skip (Tasks 2–3), verification list (Task 4), deferred issues (Task 5).
- **Spec correction:** the spec says draft mode omits `data-reveal` in `BlockRenderer`; `BlockRenderer` runs on the client, so the plan gates via `RevealObserver disabled` and Task 5 updates the spec to match.
- **Names:** `data-reveal`, `data-revealed`, `js-reveal`, `RevealObserver({disabled})` are consistent across tasks.
