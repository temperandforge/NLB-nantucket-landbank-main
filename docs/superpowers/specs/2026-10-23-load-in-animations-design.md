# Load-in text animation and page transitions

Status: proposed. Nothing built.

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
| Text load-in | **Word cascade**: headline words rise ~0.4em and sharpen from a 6px blur, ~45ms apart, 800ms each, `cubic-bezier(.22,1,.36,1)`. Eyebrow, body and buttons plain-fade in after the headline. |
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

- **`<Cascade as="h1" className=…>{text}</Cascade>`** is a server component. It splits a string into
  words, each an inline-block span with a `--i` index; real spaces stay between spans, so screen
  readers and line wrapping behave as for plain text. The delay index is capped at about 14 so a long
  heading cannot drag.
- **`.load-in`** is a utility class for the rest of the first screen: a plain fade, delay set per
  element so it lands after the headline.
- **Tokens** (duration, easing, per-word delay, the navigation delay) are CSS variables in
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
- Only `opacity`, `transform` and `filter` animate: no layout shift, no LCP change.
- Content is visible without JS (nothing depends on a script).

### Page transitions (`frontend/components/PageTransition.tsx`)

- `<ViewTransition>` enter and exit do not fire in a layout, because layouts persist across
  navigations (Next docs, *Designing view transitions*). The wrapper therefore lives in each
  `page.tsx`.
- **`<PageTransition>`** wraps `<ViewTransition enter exit default="none">` and gives the **soft
  handoff**: old content fades and drops ~8px in ~180ms, then the new page fades in. Used by each
  route's `page.tsx`: the `[...slug]` catch-all, news, events, projects, properties and search.
- The new page's cascade starts after a navigation delay (a CSS variable, ~150ms) so words never
  animate under the fading old page. On first load the delay is zero.
- **The header is anchored** with its own `view-transition-name` and CSS that suppresses its
  animation (per the docs), so the bar never moves. The footer is not handled specially.
- **Morph.** A card's image and the detail-page hero share `view-transition-name`s of the form
  `property-<slug>`, `project-<slug>`, `news-<slug>`, with `share="morph" default="none"`. Wired for
  properties, projects and news. People and staff cards have no detail page and get nothing.
- `::view-transition { pointer-events: none }`, so clicks during a transition reach the page.
- `prefers-reduced-motion` sets all transition durations to 0.

### Known risks

- **Morph pairing.** Per the docs, a morph pairs only when the destination renders in the same commit
  as the navigation. A page that waits on data falls back to the soft handoff. How often that happens
  with our Sanity fetches is unknown until tried; measuring it is an explicit verification step, and
  the result decides whether a deferred issue is needed.
- **Pre-implementation spike (2026-10-23): the naive morph did not pair.** On a production build, every
  detail route is pre-rendered (properties, projects, news, events, pages; only `/search` is dynamic),
  and the property page's RSC payload was prefetched before the click. A `<Link>` click did start a
  view transition and it became ready in ~24ms. Yet with matching `<ViewTransition name=…>` on the
  card image and the detail hero (tried with and without `share`/`default`), React applied no names:
  only `root` animated. Cause not found. The implementation must start with a short investigation
  (e.g. whether the archive card, a lazily hydrated client list, or the detail hero's position in the
  tree prevents pairing) before wiring the morph widely. If it cannot be made to pair, ship the soft
  handoff alone and file the morph as deferred.
- **Link audit.** Only `Header`, `ResolvedLink`, `CardNews`, `CardProperty` and a few others use
  `<Link>`. `ButtonLink`, `LinkButton`, `LinkRow`, `Footer`, `SearchResults`, `ProjectPreviewView` and
  `CardProject` use a plain `<a>`, which is a full page load with no transition or prefetch. Internal
  hrefs through those need `<Link>` for page transitions to cover them; external ones stay `<a>`.
- **Build environment.** This shell has `NODE_ENV=development`, which makes `next build` fail on
  `/_global-error`. Build with `NODE_ENV=production`.
- **The in-app browser pane cannot verify view transitions**: it produces no render frames, so even an
  empty transition never becomes ready. Verify in a real Chrome.
- **Browser back/forward** carry no transition type. The soft handoff still plays; the morph reverses
  only when both pages carry matching names.
- **Safari and Firefox** are unverified (only one browser can be driven here). Without View
  Transitions support the site works and simply doesn't animate.
- **Presentation navigation** behaviour is reasoned, not observed, until checked in Studio.

### Files

New: `frontend/components/Cascade.tsx`, `frontend/components/PageTransition.tsx`,
`frontend/css/motion.css` (imported from `app/layout.tsx`).

Edited, a line or two each: the hero blocks and `PageHeader`, the four detail views, `CardProperty`,
`CardProject`, `CardNews` and their detail heroes, each route's `page.tsx`, and the header. `CardProject`
also changes its plain `<a>` to `next/link`'s `<Link>`: an `<a>` is a full page load, so it can neither
prefetch nor run a view transition. Other `<a>` card links get the same check. No schema, Studio,
dependency or generated-type changes.

## Verification

No test framework exists, so verification is in a real browser:

- `npm run type-check` and `npm run lint` in `frontend`.
- First-paint cascade on a hero page; the soft handoff between two pages; a property card morphing to
  its detail page and back.
- Reduced motion (emulated): static text, instant swaps. Presentation text with stega characters
  renders unsplit.
- LCP and CLS before and after, by the same method as #56.
- Morph pairing, measured on a production build (`next build && next start`). `next dev` does not
  prefetch, so a dev-server result would understate pairing. Check news and projects as well as
  properties, since only properties is known to use `generateStaticParams`.
- The dev server started for verification is stopped afterwards.

## Deferred

Per the repo rule each gets a GitHub issue, linked here when filed.

- **Scroll-in cascade** for headings below the first screen (the earlier "B" option). To be filed.
- **Reliable morph pairing**, only if verification shows pairing is unreliable. The candidate fix is
  intent-based prefetching (e.g. ForesightJS) on the affected routes; it is not adopted up front
  because Next's own `<Link>` prefetch should cover pre-built pages, it adds a dependency, and it
  does nothing on touch devices. To be filed if needed.
- Related existing issues, to link rather than duplicate: #53 (route-to-route transitions, which this
  spec supersedes and should close), #52 (per-block motion setting), #54 (scroll-scrubbed motion).
