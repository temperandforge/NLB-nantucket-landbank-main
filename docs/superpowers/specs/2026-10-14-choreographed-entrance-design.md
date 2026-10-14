# Choreographed entrance and inside-block stagger

Date: 2026-10-14
Status: draft, awaiting review
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
**parts** and marks them.

- Candidates: `h1, h2, h3, h4, p, figure, img, video, blockquote, ul, ol` and any element already
  carrying `data-reveal-part`.
- Excluded: anything inside `.splide`, `.mapboxgl-map`, `form`, or `[data-reveal-skip]`.
- Nested matches collapse to the outermost (a `p` inside a `blockquote` is not its own part).
- At most 8 parts per block, in DOM order. Long archives therefore stagger their first screen
  and leave the rest static.
- Each part gets `data-reveal-part` and `style="--reveal-index: N"` (set with
  `style.setProperty`, so React-managed inline styles are untouched).
- If a block has at least one part, the wrapper gets `data-reveal-staggered`. Otherwise the wrapper
  falls back to today's whole-block rise.

Backgrounds, decorative line art and full-bleed colour fields are not candidates, so they stay still
while the content staggers over them. That contrast is the choreography.

Detection runs in the same `process()` pass that already shows or observes blocks, so it covers
client navigation and blocks added later, through the existing `MutationObserver`.

### Scroll stagger

Hidden state, only under `.js-reveal`:

```css
.js-reveal [data-reveal]:not([data-revealed]) [data-reveal-part] {
  opacity: 0;
  translate: 0 32px;
}
.js-reveal [data-reveal-staggered]:not([data-revealed]) {
  opacity: 1;
  transform: none;
}
```

On reveal (`data-revealed` set), each part plays a keyframe animation:

```css
@keyframes reveal-part {
  from { opacity: 0; translate: 0 32px; }
  to   { opacity: 1; translate: 0 0; }
}
[data-revealed] [data-reveal-part] {
  animation: reveal-part 700ms var(--motion-ease-out)
    calc(var(--reveal-index, 0) * 90ms) backwards;
}
```

Why an animation and the individual `translate` property, not a transition on `transform`:

- A transition on a part would override the part's own transitions (button hover, link colour).
- `animation-fill-mode: backwards` holds the first keyframe during the delay and releases the
  element afterwards, so hover and focus styles work as before.
- `translate` composes with any `transform` an element already has.

The wrapper's own whole-block rise stays for blocks without parts (`:not([data-reveal-staggered])`).

Tokens (`--motion-part-distance: 32px`, `--motion-part-duration: 700ms`,
`--motion-part-stagger: 90ms`) live next to the existing `--motion-reveal-*` tokens.

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
  | eyebrow | 0ms |
  | `h1`, `h2` | 100ms |
  | `p` | 200ms |
  | button / link row | 300ms |

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

- `frontend/components/RevealObserver.tsx`: part detection and marking inside `process()`.
- `frontend/components/BlockRenderer.tsx`: `data-entrance` on the first block.
- `frontend/app/layout.tsx`: `data-draft` on `<html>`.
- `frontend/css/ui.css`: part hidden state, keyframes, entrance rules, tokens, reduced-motion and
  print overrides.
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
- Parts are marked by JS after hydration. The hidden state is only applied once marking is done
  (same synchronous pass that adds `js-reveal`), so there is no frame where a marked part is
  hidden before its block is ready.

## Deferred

- Page transitions between routes via `viewTransition`.
- Scroll-scrubbed motion (GSAP and ScrollTrigger, scoped and dynamically imported).
- A per-block motion setting in Sanity: [#52](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/52).
- Per-card stagger inside grids beyond the first screen. Issue
  [#51](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/51) is to be closed when
  the inside-block stagger ships, for the first 8 parts; stagger of later grid cards is not covered and needs
  its own issue if wanted.
