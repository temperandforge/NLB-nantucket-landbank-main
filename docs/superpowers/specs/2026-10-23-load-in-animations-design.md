# Load-in text animation and page transitions

Status: implemented on branch `worktree-load-animations` (not yet merged): Cascade and `motion.css`, first-screen cascade wiring, route `<PageTransition>` with header anchor, property and project card-to-hero morph, internal links through `<Link>`. Decision record: DECISIONS 4.11. Verification (type-check, lint, production build, real-Chrome pass) is recorded in the task report and the PR; the LCP/CLS figures are in the Guardrails below; Safari, Firefox, reduced-motion emulation and Presentation were not observed.

## Goal

Pages feel finished and a little refined as they arrive. The first screen's headline cascades in word
by word, the rest of the first screen follows with a plain fade, and navigating between pages is a
short animated handoff, with card images morphing into their detail-page hero.

A fresh start: the earlier attempt (PR #56: scroll reveal, in-block stagger, page-load entrance) had
the wrong feel and choreography. Its guardrails carry over; its choreography and its auto-detection
mechanism do not.

## Decisions made while brainstorming

Chosen by comparing live motion demos (a throwaway companion, not committed):

| Question | Choice |
|---|---|
| Text load-in | **Word cascade**: headline words rise ~0.4em and sharpen from a 6px blur, ~45ms apart, 600ms each (800ms felt too slow on a phone once the easing was softened), `cubic-bezier(.33,1,.68,1)` (ease-out cubic; the original expo-out `.22,1,.36,1` did 95% of the movement in the first third, so the animation looked like it ended early on a phone). Eyebrow, body and buttons plain-fade in after the headline. The blur is only on devices with a fine pointer and hover: on iPhone Safari, animating `filter` on every word was choppy and snapped at the end (WebKit paints filtered text on the CPU), so touch devices get opacity + rise only. |
| Page transition | **Shared-element morph** for card → detail, with the **soft handoff** as the fallback everywhere else. |
| Scope | **First screen on load and navigation only.** Nothing animates on scroll. |
| Mechanism | **Server-rendered `<Cascade>` + CSS, and React `<ViewTransition>`.** No animation library, no client JS. |

## Non-goals

- Scroll-in or reveal-on-scroll of any kind (deferred, see below).
- Per-block or per-page motion settings in Sanity.
- Directional (forward/back) slides, the curtain wipe, or the soft-focus text style.
- An animation library (Motion, GSAP).

## Design

### Load-in primitives (`frontend/css/motion.css`, `frontend/components/Cascade.tsx`)

- **`<Cascade as="h1" className=… text={text} />`** is a server component. It splits a string into
  words, each an inline-block span with a `--i` index; real spaces stay between spans, so screen
  readers and line wrapping behave as for plain text. The delay index is capped at about 14 so a long
  heading cannot drag.
- **`.load-in`** is a utility class for the rest of the first screen: a plain fade, delay set per
  element so it lands after the headline.
- **Tokens** (duration, easing, per-word delay, page in/out durations) are CSS variables in
  `motion.css`, so the feel is tuned in one place. Named per the project's token rule; no Figma
  variable exists for motion, so these are project tokens, not Figma-derived ones.
- **First paint and replay.** CSS animations start at first paint with no wait for hydration, and replay
  on every navigation because the nodes mount again.
- **Only first-screen text opts in:** the hero blocks (`Hero`, `HeroImage`, `HeroSecondary`,
  `HeroTertiary`, `HeroVideo`), `PageHeader`, and the detail-view titles (`PropertyView`, `ProjectView`,
  `ArticleView`, `EventView`). Opt-in is explicit, one line per headline.

Guardrails:

- `prefers-reduced-motion` and print render the text static.
- **Presentation / draft mode:** Sanity text there carries invisible stega characters that splitting
  would break. `<Cascade>` detects them in the string and renders the heading unsplit. It must not
  call `draftMode()`, which would make every page dynamic.
- Only `opacity`, `transform` and `filter` animate: no layout shift (CLS 0 on every page measured; `/about-us/history` showed a constant 0.0000087 with and without `motion.css`). LCP on a page with a Cascade h1 (production build, real Chrome, median of 5, with vs without `motion.css`): `/about-us/history` 204 ms vs 156 ms (+48 ms, run spread 144-284 ms), `/properties/head-of-the-plains` 148 ms vs 152 ms (-4 ms). The LCP element is the hero image (IMG) on both, not the headline, and the spread across runs is larger than the difference, so no LCP effect is established; it is not proven absent either.
- Content is visible without JS (nothing depends on a script).

### Page transitions (`frontend/components/PageTransition.tsx`)

- `<ViewTransition>` enter and exit do not fire in a layout, because layouts persist across
  navigations (Next docs, *Designing view transitions*). The wrapper therefore lives in each
  `page.tsx`.
- **`<PageTransition>`** wraps `<ViewTransition enter exit default="none">` and gives the **soft
  handoff**: old content fades and drops ~8px in ~180ms, then the new page fades in. Used by each
  route's `page.tsx`: the `[...slug]` catch-all, news, events, projects, properties and search.
- The new page is hidden for the first 180ms by the soft handoff's page-in delay, so the cascade
  starts after the old page has faded and words never animate under it. There is no separate
  navigation delay: an `:active-view-transition` delay would change running animations
  retroactively when the transition ends. On first load there is no delay.
- **The header is anchored** with its own `view-transition-name` and CSS that suppresses its
  animation (per the docs), so the bar never moves. The footer is not handled specially.
- **Morph.** A card's image and the detail-page hero share `view-transition-name`s of the form
  `property-<slug>` and `project-<slug>`, with `share="morph" default="none"`. Wired for properties
  and projects only, and only on the archive grids (an opt-in `morph` prop on the card). News has no
  morph: `ArticleView` renders no hero image to pair with. People and staff cards have no detail page
  and get nothing.
- `::view-transition { pointer-events: none }`, so clicks during a transition reach the page.
- `prefers-reduced-motion: reduce` sets all view-transition durations and delays to 0 (one
  `@media (prefers-reduced-motion: reduce)` block in `motion.css`), so pages swap instantly.

### Known risks

- **Morph pairing.** Per the docs, a morph pairs only when the destination renders in the same commit
  as the navigation. A page that waits on data falls back to the soft handoff. How often that happens
  with our Sanity fetches is unknown until tried; measuring it is an explicit verification step, and
  the result decides whether a deferred issue is needed.
- **Pre-implementation spike (2026-10-23): the first spike's target had no hero, so no pair formed (see verdict below).** On a production build, every
  detail route is pre-rendered (properties, projects, news, events, pages; only `/search` is dynamic),
  and the property page's RSC payload was prefetched before the click. A `<Link>` click did start a
  view transition and it became ready in ~24ms. Yet with matching `<ViewTransition name=…>` on the
  card image and the detail hero (tried with and without `share`/`default`), React applied no names:
  only `root` animated.

  **MORPH: GO — wrap the card's image wrapper `div` (`relative h-[370px] …` in `CardProperty`) and
  the detail hero wrapper `div` (`relative h-[523px] …` in `PropertyIntro`), each directly, in
  `<ViewTransition name={`property-${slug}`} share="morph" default="none">`. No layout boundary,
  config flag or tree move is needed.** The spike's target, `/properties/cisco-beach`, renders no hero:
  `PropertyIntro` omits the hero when the property has neither its own image nor a default image, so
  there was no destination name to pair with. Only 3 of 20 properties render one today
  (`head-of-the-plains`, `smooth-hummocks-coastal-preserve`, `surfside-weweeder-ton`); the others get
  the soft handoff. That is a content gap, not a code one. A pair also needs the source card to be in
  the viewport at click time (always true for a real click). Side effect: an archive card whose
  property also appears in the destination's "More properties" grid below the fold gets an old-only
  snapshot and fades out in place. **Decision for Task 5:** name only the archive cards. `CardProperty`
  takes an opt-in prop (e.g. `morph?: boolean`). The archive passes `true`; `PropertiesPreviewView`'s
  "More properties" grid leaves it off, so its cards render no `<ViewTransition>`. The `morph` class's
  CSS (`::view-transition-group(.morph)` etc.) is not defined yet. Task 3/5 adds it to `motion.css` only
  if the browser's default morph needs tuning; otherwise it is omitted.
  Evidence (production build, real Chrome, archive → `head-of-the-plains`, both with and without
  `share`/`default`): `::view-transition-group(property-head-of-the-plains)` plus old/new present,
  hero in the DOM by the end of the transition's update callback; the `morph` class was applied.
- **Link audit.** Only `Header`, `ResolvedLink`, `CardNews`, `CardProperty` and a few others use
  `<Link>`. `ButtonLink`, `LinkButton`, `LinkRow`, `Footer`, `SearchResults`, `ProjectPreviewView` and
  `CardProject` use a plain `<a>`, which is a full page load with no transition or prefetch. Internal
  hrefs through those need `<Link>` for page transitions to cover them; external ones stay `<a>`.
- **Build environment.** This shell has `NODE_ENV=development`, which makes `next build` fail on
  `/_global-error`. Build with `NODE_ENV=production`.
- **The in-app browser pane cannot verify view transitions**: it produces no render frames, so even an
  empty transition never becomes ready. Verify in a real Chrome.
- **Browser back/forward start no view transition** (observed on a production build in Chrome,
  `history.back()` from a property page to the archive): the page swaps instantly, with neither the
  soft handoff nor a reverse morph.
- **A header hidden by scroll snaps back in** at the start of a transition instead of sliding down:
  its old snapshot is hidden and its group does not animate (observed, not fixed).
- **Safari and Firefox** are unverified (only one browser can be driven here). Without View
  Transitions support the site works and simply doesn't animate.
- **Presentation navigation** behaviour is reasoned, not observed, until checked in Studio.

### Files

New: `frontend/components/Cascade.tsx`, `frontend/components/PageTransition.tsx`,
`frontend/css/motion.css` (`@import`ed from `css/globals.css`).

Edited, a line or two each: the hero blocks and `PageHeader`, the four detail views, `CardProperty`,
`CardProject`, `CardNews` and their detail heroes, each route's `page.tsx`, and the header. `CardProject`
also changes its plain `<a>` to `next/link`'s `<Link>`: an `<a>` is a full page load, so it can neither
prefetch nor run a view transition. Other `<a>` card links get the same check. No schema, Studio,
dependency or generated-type changes.

## Verification

No test framework exists, so verification is in a real browser:

- `npm run type-check` and `npm run lint` in `frontend`.
- First-paint cascade on a hero page; the soft handoff between two pages; a property card morphing to
  its detail page (browser back swaps instantly, with no transition).
- Reduced motion (emulated): static text, instant swaps. Presentation text with stega characters
  renders unsplit.
- LCP and CLS before and after, by the same method as #56.
- Morph pairing, measured on a production build (`next build && next start`). `next dev` does not
  prefetch, so a dev-server result would understate pairing. Projects and properties both use
  `generateStaticParams`; news has no morph.
- The dev server started for verification is stopped afterwards.

## Deferred

Per the repo rule each gets a GitHub issue, linked here when filed.

- **Scroll-in cascade** for headings below the first screen (the earlier "B" option): [#86](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/86).
- **News article hero morph**, blocked on `ArticleView` rendering no hero image: [#87](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/87).
- **Browser back/forward start no view transition:** [#88](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/88).
- **Header hidden by scroll snaps back in** at the start of a transition: [#89](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/89).
- **Reliable morph pairing** was not needed: pairing worked on the production build for archive to `head-of-the-plains`. Intent-based prefetching (e.g. ForesightJS) stays unadopted.
- Related existing issues: #53 (route-to-route transitions, superseded by this work; commented, left open for the maintainer to close), #52 (per-block motion setting), #54 (scroll-scrubbed motion).
