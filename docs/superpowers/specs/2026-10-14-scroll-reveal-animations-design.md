# Scroll-reveal animations

Date: 2026-10-14
Status: draft, awaiting review

## Goal

Page-builder blocks fade and rise into view as they scroll into the viewport, without hurting
Core Web Vitals (LCP, CLS, INP) or adding an animation library.

Motion is subtle: a fade plus a 20px rise, ~500ms, whole blocks only.

## Non-goals

- Per-card stagger inside grids (deferred, GitHub issue).
- A per-block opt-out field in Sanity (deferred, GitHub issue).
- Animating the header, footer, or page header.
- Any animation library (Framer Motion, GSAP).

## Design

### Seam

`components/BlockRenderer.tsx` already wraps every block in one `<div>`. That wrapper gets a
`data-reveal` attribute. No individual block component changes.

`data-reveal` is omitted when:

- `index === 0` — the first block is the LCP candidate and must never start hidden.
- Draft mode / Studio Presentation is active — Visual Editing overlays and click-to-edit must be
  untouched, and editors must always see content.

### Client island

`components/RevealObserver.tsx` is the only new client code. It renders `null` and is mounted once
in `app/layout.tsx`.

On mount (`useLayoutEffect`, so it runs before first paint):

1. Add `js-reveal` to `<html>`.
2. Create one shared `IntersectionObserver` (`rootMargin: '0px 0px -8% 0px'`, `threshold: 0.1`).
3. Observe every `[data-reveal]` element.
4. For elements already intersecting on the first callback, set `data-revealed` with the transition
   suppressed (no animation for content already in view on load). Later intersections set
   `data-revealed` normally.
5. Unobserve an element once revealed, so each animates at most once.

On client-side navigation, re-run the query when `usePathname()` changes and observe the new
elements. Disconnect the observer on unmount.

### CSS

In `css/ui.css`, next to the existing motion rules, using `--motion-*` tokens:

```css
.js-reveal [data-reveal]:not([data-revealed]) {
  opacity: 0;
  transform: translateY(20px);
}
[data-reveal] {
  transition:
    opacity 500ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .js-reveal [data-reveal]:not([data-revealed]) {
    opacity: 1;
    transform: none;
  }
}
```

### Performance and failure-safety

- The hidden state exists only under `js-reveal`. No JS, or a failed hydration, shows everything.
- Only `opacity` and `transform` animate: no layout shift, CLS stays 0. No idle `will-change`.
- One observer for the whole page; elements are unobserved after first reveal.
- Anchor jumps and fast scrolls: skipped-past blocks reveal as soon as they intersect, so nothing
  stays hidden.

## Verification

No test framework exists. Verify in the browser:

- LCP and CLS before and after.
- No flash of hidden content on load.
- Reduced-motion and JS-disabled both show all content.
- Client-side navigation between pages animates the new page.
- Draft mode shows blocks un-hidden.

Then `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`.

## Deferred

- Per-card stagger inside grids.
- Per-block opt-out field in Sanity.

Each gets a GitHub issue; numbers are added here when filed.
