# Choreographed entrance and inside-block stagger

Date: 2026-10-14
Status: implemented
Builds on: [2026-10-14-scroll-reveal-animations-design.md](2026-10-14-scroll-reveal-animations-design.md)

## Goal

Make the motion noticeable and deliberate. Two additions to the existing whole-block scroll reveal:

1. **Inside-block stagger.** As a block scrolls into view, its parts (heading, copy, media) arrive one
   after another instead of the block arriving as one slab.
2. **Page-load entrance.** On arrival, the header and the first block's text play a short timed
   sequence.

Both must hold the existing performance bar: no layout shift, no animation library, no LCP delay,
content always visible without JS, off under reduced motion.

## Non-goals

- Page transitions between routes (`viewTransition`); a separate, later prototype.
- Scroll-scrubbed motion (parallax, pinned sections) and GSAP.
- Animating hero images or video.
- A Sanity field to configure or disable motion per block (issue #52 stays open).
- Editing the ~35 block components to tag their parts by hand.

## Design

### Parts, detected automatically

`RevealObserver` already scans `[data-reveal]` blocks. For each block it now also picks the block's
**parts** and gives each a paused animation (below).

- Candidates: `h1, h2, h3, h4, p, figure, img, video, blockquote, ul, ol`.
- Excluded: anything inside `.splide`, `.mapboxgl-map`, `form`, or `[data-reveal-skip]`.
- Excluded: elements that are `position: absolute|fixed` or already carry their own `translate` or
  `transform` (a centred pin, a floating image). Animating `translate` on them would override their own
  offset for the length of the animation. Found during the whole-site pass.
- Nested matches collapse to the outermost (a `p` inside a `blockquote` is not its own part).
- Reach, not a count: only candidates within 1.5 viewport heights of the block's top are parts (at most
  24), so everything a visitor sees when the block arrives staggers, and a row of cards is never split
  into animated and static neighbours. The delay stops growing after 7 steps (`min(index, 7) × 90ms`),
  so a long run of cards lands together.
- If a block has at least one part, the wrapper gets `data-reveal-staggered` and stays still. Otherwise
  the wrapper falls back to the whole-block rise.
- If Suspense swaps a part out before its block reveals, the block is re-staged by the existing
  `MutationObserver` pass.

Backgrounds, decorative line art and full-bleed colour fields are not candidates, so they stay still
while the content staggers over them. That contrast is the choreography.

Detection runs in the same `process()` pass that already shows or observes blocks, so it covers client
navigation and blocks added later.

### Scroll stagger (Web Animations API)

Parts are animated with `element.animate()`, not with attributes or classes. The page's server HTML is
hydrated lazily (archive blocks sit behind Suspense), and any attribute added to an element React has
not hydrated yet is reported as a hydration mismatch. The first version tagged parts with a
`data-reveal-part` attribute and produced mismatches on every archive page; animations touch no
attributes.

- At staging time each part gets a **paused** animation with one keyframe,
  `{opacity: 0, translate: 0 32px}`, `duration: 700`, `delay: min(index, 7) * 90`,
  `easing: cubic-bezier(0.22, 1, 0.36, 1)`, `fill: 'backwards'`. Paused at time 0, the backwards fill
  holds the part hidden and offset.
- On reveal the block's animations `play()`. On the instant path (block already on screen) they are
  `cancel()`led, so nothing flashes or replays.
- The single keyframe has no end frame, so the animation finishes at the element's **own** opacity and
  translate. A part with its own `opacity` (for example a muted card line) is not overridden or snapped
  back, and neither is one with a Tailwind translate.
- Reduced motion: no part animations are created. Print: `beforeprint` cancels every pending animation.
- The wrapper rule in `css/ui.css`
  (`.js-reveal [data-reveal-staggered]:not([data-revealed]) { opacity: 1; transform: none }`) keeps the
  wrapper still while its parts move. It must come after the base hidden-wrapper rule.

The distance, duration, stagger and easing are constants in `RevealObserver.tsx` (the easing mirrors
`--motion-ease-out`).

### Page-load entrance (CSS-only)

Runs at first paint, with no wait for hydration, so there is no hidden-then-visible flash.

- `BlockRenderer` sets `data-entrance` on the wrapper of block `index === 0`, alongside the existing
  decision not to give it `data-reveal`.
- **Header:** `translate`-only slide down (`-12px` to `0`, 500ms). It never changes opacity, so the
  logo or nav cannot delay LCP.
- **First block text:** an `opacity` + `translate` rise (24px, 600ms) on its text parts, staggered by
  element type, because no index exists before JS runs:

  | Part | Delay |
  | --- | --- |
  | eyebrow (`[data-eyebrow]`) | 0ms |
  | `h1`, `h2`, `h3` | 100ms |
  | `p`, `ul`, `ol` | 200ms |
  | standalone link or button | 300ms |

  A link inside a paragraph, heading or list item rides with its parent and does not animate on its own.
  The keyframes have no end frame, so each element finishes at its own opacity and translate.

  Total delay is capped at 300ms so a hero whose LCP element is text is not pushed back.
- **Media** (`img`, `picture`, `video`, `figure`) in the first block is excluded and never animates.
- Selectors are scoped to `[data-entrance]` and exclude `[data-reveal-skip]`.

### Guardrails

- `prefers-reduced-motion: reduce` and `print`: no part is hidden, no keyframe or entrance runs.
- Draft mode: the layout sets `data-draft` on `<html>`; entrance CSS is scoped to
  `html:not([data-draft])`, so Presentation reloads do not replay it. Scroll stagger is already
  off because `js-reveal` is not set.
- No JS or failed hydration: parts are only hidden under `.js-reveal`. The entrance is CSS and
  completes on its own.
- Only `opacity`, `translate` and `transform` change: no layout shift.
- No `will-change` left on idle elements; animations release their fill when finished.

### Files

- `frontend/components/RevealObserver.tsx`: part detection and the paused part animations inside `process()`.
- `frontend/components/BlockRenderer.tsx`: `data-entrance` on the first block.
- `frontend/app/layout.tsx`: `data-draft` on `<html>`.
- `frontend/css/ui.css`: staggered-wrapper rule, entrance rules and tokens, reduced-motion and print
  overrides.
- `frontend/components/blocks/Eyebrow.tsx`: `data-eyebrow` hook.
- `docs/superpowers/specs/2026-10-14-scroll-reveal-animations-design.md`: note that the stagger
  supersedes the whole-block rise for blocks with parts.

## Verification

No test framework exists; verify in the browser.

- **Performance:** LCP and CLS on the home page and one inner page, before and after. LCP must not
  move later by more than noise; CLS stays about 0.
- **Visual:** parts arrive in order with the background still; mid-animation samples show the
  expected opacity and `translate` values.
- **Interaction:** button hover and focus states still work after the animation finishes.
- **Blocks:** tall archive blocks (stagger the first screen only, no hidden content), the map
  block, the carousel/timeline (not staggered, still functional), and a block with no detectable
  parts (falls back to whole-block rise).
- **Entrance:** header slides, first-block text staggers by type, hero media does not move, nothing
  flashes before the animation.
- **Guardrails:** reduced motion and print show everything with no motion; draft mode shows no
  entrance.
- Then `npm run sanity:typegen`, `npm run type-check` and `npm run lint` in `frontend`.

## Risks

- Part detection is heuristic. Some blocks may stagger awkwardly or pick up an element that should
  stay still. Mitigation: a pass through the main block types, with `data-reveal-skip` added where
  needed.
- An LCP element that is hero text will be delayed by the entrance. Mitigation: short capped delays,
  and measurement rather than assumption. If LCP regresses, shorten or drop the first-block text
  entrance and keep the header slide.
- Parts are staged by JS after hydration, before first paint. They are staged in the same synchronous
  pass that adds `js-reveal`, so there is no frame where a part is visible and then hidden.

## Deferred

- Page transitions between routes via `viewTransition`:
  [#53](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/53)
- Scroll-scrubbed motion (GSAP and ScrollTrigger, scoped and dynamically imported):
  [#54](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/54)
- Stagger of grid and list cards beyond the first screen (a list element is one part, so e.g. the
  properties archive fades as one element):
  [#55](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/55). The inside-block stagger
  delivers the first-screen half of [#51](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/51),
  which is closed.
- A per-block motion setting in Sanity: [#52](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/52)
