# Motion: how the page animates, and how to work on it

The site has a small animation system: headlines cascade in word by word, the rest of the first
screen fades in, every section below it animates as it scrolls into view, and route changes get a
soft handoff (with card images morphing into their detail-page hero). It is **CSS plus a few server
components, with no animation library and no client JavaScript** for the motion itself.

This is the working guide. The reasoning is in [DECISIONS.md](DECISIONS.md) (entries 4.11 to 4.14)
and the original design in
[superpowers/specs/2026-10-23-load-in-animations-design.md](superpowers/specs/2026-10-23-load-in-animations-design.md).
How it was measured and what it cost is in [performance.md](performance.md).

## The pieces

| Piece | Where | What it does |
|---|---|---|
| Tokens, keyframes, rules | `frontend/css/motion.css` | Every duration, easing, keyframe and view-transition rule. The one place to tune the feel. |
| `<Cascade>` | `frontend/components/Cascade.tsx` | Splits a headline (or a hero description) into word spans that the CSS animates. |
| Word splitting | `frontend/sanity/lib/cascade.ts` | Pure helper: `cascadeWords`, `CASCADE_MAX_INDEX` (14), `CASCADE_BODY_MAX_INDEX` (48). |
| `.load-in` | `motion.css` | A plain fade for the eyebrow, landing just after the headline. |
| `data-enter` tagging | `BlockRenderer`, `<Enter>`, `frontend/sanity/lib/enter.ts` | Marks a block `load` (first two) or `scroll` (the rest) so the CSS animates its parts. |
| `<PageTransition>` | `frontend/components/PageTransition.tsx` | The soft handoff between pages, wrapped inside each `page.tsx`. |
| Morph | `ViewTransition` on cards and detail heroes | Card image to hero image, property and project archives only. |

## Current feel (all in `motion.css`)

| Token | Value | Notes |
|---|---|---|
| `--motion-duration` | 450ms | Per word, and per fade. |
| `--motion-ease` | `cubic-bezier(.33,1,.68,1)` | Ease-out cubic. |
| `--cascade-step` | 30ms | Gap between headline words. |
| `--cascade-rise` / `--cascade-blur` | .4em / 6px | Blur only where a fine pointer exists (see below). |
| `--cascade-step-body` / `--cascade-body-offset` | 10ms / 240ms | A hero description sweeps in quickly, starting as the headline lands. |
| `--enter-rise` / `--enter-step` | 14px / 70ms | Parts of the first two blocks. |
| `--enter-base-0` / `--enter-base-1` | 120ms / 360ms | When block 0 and block 1 start. |
| `--enter-scroll-step` | 6% | Offset between siblings along a scroll range, so a grid staggers. |
| `--page-out-duration` / `--page-in-duration` | 180ms / 280ms | The soft handoff. |

How the values got here (so nobody undoes them by accident):

- **Blur is desktop-only.** iPhone Safari paints filtered text on the CPU, so animating `filter: blur()`
  on every word was choppy and snapped when the filter was removed at the end. Touch devices get
  opacity plus a rise. The blur sits in a `(hover: hover) and (pointer: fine)` block.
- **The easing was softened** from `cubic-bezier(.22,1,.36,1)` (expo-out), which did about 95% of
  the movement in the first third, so on a phone the animation looked as if it ended early.
- **The pace was shortened twice** (800ms and 45ms, then 600ms, then 450ms and 30ms) after phone
  feedback.
- **A hero description never blurs.** It can be 50 or more small words.

## Headlines and descriptions

```tsx
<Cascade as="h1" className="text-headline-2xl" text={block.heading} />
<Cascade as="p" variant="body" className="text-body-base" text={block.body} />
```

- `text` is a string. Blank text renders **nothing** (never an empty heading). Text that carries
  Sanity stega characters (Studio Presentation) renders **unsplit**, because splitting would break
  the click-to-edit markers. `cascadeWords` returns `[]` for blank and `null` only for stega.
- Words are `inline-block`, so `break-words` and `hyphens` cannot break inside a word. A call site with
  an unbreakable long word must handle that itself. Real spaces stay between the spans, so screen
  readers and line wrapping behave as for plain text.
- Opt in per headline, one line each. The hero blocks, `PageHeader` and the detail-page titles do.
- `variant="body"` is for a hero description: 10ms per word, starts at 240ms, capped at 48 words
  (the rest arrive together), never blurred.
- The eyebrow uses `className="load-in"` (optionally `style={{'--load-in-step': 1}}`).

## The rest of the page: parts

`BlockRenderer` tags each block from its index (`enterAttrs(index)`): the first two are
`data-enter="load"` with `data-enter-order` 0 and 1, the rest are `data-enter="scroll"`. Detail pages
(property, project, news, event) wrap their sections in `<Enter>` the same way: `<Enter index={0}>`
for the first screen, plain `<Enter>` for everything below.

Inside a tagged block, a **part** animates: the outermost heading, paragraph, image, figure,
blockquote, `ul > li`, `ol > li`, `.button`, or anything marked `data-part`. Only the outermost part
moves, so a card (its image and text inside it) animates as one unit and nothing compounds. Left
alone: text that already cascades, `.load-in`, `aria-hidden` decoration, and anything inside
`[data-morph]`.

- **Load layer** (blocks 0 and 1): the parts fade and rise 14px on a timer, staggered by their
  position among their siblings, after the headline. **Images do not animate here**: a hero image
  is usually the LCP element, and starting it at opacity 0 delayed it.
- **Scroll layer** (later blocks): the same fade and rise, driven by the part's own entry into the
  viewport with CSS scroll-driven animations (`animation-timeline: view()`), inside
  `@supports (animation-timeline: view())`. The motion follows the scroll and reverses if you scroll
  back. Images fade only, with no movement. Chrome and Edge, and Safari 26 and newer, have it;
  Firefox and older Safari see the sections static, which is the previous behaviour.

### Rules for components you add or change

- **A card that is not a list item** needs `data-part` on its outer element, or its pieces animate
  separately (the news preview's `Tile` has it).
- **A widget that shows and hides its own children (a slider) must have `data-part` on its root.** A
  CSS animation restarts whenever its element goes from hidden to shown, so animating a slider's
  slides replayed the fade on every change (the history timeline did, until its root got `data-part`).
- **A morph target's hero wrapper needs `data-morph`**, or a fade-in on the shared image makes the
  morph flicker.
- **List items re-rendered by client state** (a filter changing a list) can replay the stagger. That
  has not been looked at.
- The long parts selector is written out in three places in `motion.css` (load, scroll, and the
  draft-mode switch-off). They must stay identical; `verifyMotionCss.mts` pins it.

## Page transitions

`<PageTransition>` wraps a route's content inside its `page.tsx`: the old page fades and drops 8px,
then the new one fades in. **It must be inside the page, never a layout**, because `<ViewTransition>`
enter and exit do not fire in a layout. A new route gets no transition until its `page.tsx` wraps its
content. The header has its own `view-transition-name` so it never moves.

The **morph** pairs a card image with the detail hero (properties and projects). The archive card gets
a name only through an opt-in `morph` prop that the archive grids pass; the "More properties" grids on
the destination leave it off, or the card would claim the same name and fade out in place. A page
with no hero image just gets the soft handoff (only 3 of 20 properties have a hero today). News has
no morph because `ArticleView` renders no hero image.

Not covered: browser back and forward start no view transition (the page swaps instantly), and a
header hidden by scroll snaps back in at the start of a transition. Both are tracked below.

## What switches it off

- **Reduced motion:** every animation is inside one `@media screen and (prefers-reduced-motion:
  no-preference)` block, so reduced-motion and print users see static text with no hidden start
  state. A separate `reduce` block zeroes view-transition durations so the browser's own default
  transitions do not run either.
- **No JavaScript:** nothing depends on a script; the start states come from the keyframes.
- **Studio Presentation:** `DraftModeToast` sets `data-draft` on `<html>` and a CSS rule turns the part
  animations off, so editors always see their content. (Reasoned from the code; not observed in Studio.)

## The guard scripts

There is no test framework, so these are plain Node scripts that import the real code. Run them from
`frontend/`:

```bash
node scripts/verifyCascade.mts      # word splitting, caps, stega, NBSP
node scripts/verifyMotionCss.mts    # the animation contract in motion.css (43 checks)
node scripts/verifyEnter.mts        # which blocks are load vs scroll
node scripts/verifyLinks.mts        # which hrefs are internal
```

`verifyMotionCss.mts` reads `motion.css` as text and pins the tokens and their values, that every
animation sits inside the one guarded block, the shared parts selector, the load and scroll rules, the
no-animation-on-load-images rule, the draft-mode switch-off, and that blur is only in the fine-pointer
block. **When you change a token, change its expected value in the script first and watch it fail.**
It reads source text, so it cannot see what the build outputs; a production build in real Chrome is
the real check.

## Testing it for real

- **View transitions cannot be verified in the in-app browser pane** (it produces no render frames).
  Use real Chrome against a production build: `NODE_ENV=production npx next build` then
  `NODE_ENV=production npx next start -p 3107`. The shell may export `NODE_ENV=development`, which
  breaks `next build` on `/_global-error`.
- **Bust the cache** with a query string (`?fresh=1`). Static pages and their chunks are cached, and a
  stale tab will show the previous build.
- To check a morph, wrap `document.startViewTransition`, click a real link, and after `transition.ready`
  read the pseudo-element names from `document.getAnimations()`; you want
  `::view-transition-group(property-<slug>)`.
- Animations are only checked by reading values (opacity, animation names, timelines) unless you can
  watch a real device. **Feel on a phone is the final test**, and it has overruled the desktop
  numbers more than once.

## Open items

- [#86](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/86): a word-by-word
  cascade below the fold (sections below it currently enter as whole parts, not word by word).
- [#87](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/87): a news article hero
  morph, blocked on `ArticleView` having no hero image.
- [#88](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/88): back and forward
  start no view transition.
- [#89](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/89): a scroll-hidden
  header snaps back in at the start of a transition.
- Not observed: Safari and Firefox on desktop, reduced-motion emulation, Studio Presentation.
