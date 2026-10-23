# Load-in text animation and page transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Word-cascade headlines on the first screen, plus route transitions (soft handoff everywhere, card-to-detail image morph where it can be made to work).

**Architecture:** A server-rendered `<Cascade>` splits headline text into word spans animated by one CSS keyframe; `.load-in` fades the rest of the first screen. Route transitions use React `<ViewTransition>` wrapped per page by `<PageTransition>`, with named boundaries on card images and detail heroes for the morph. No client JS, no animation library.

**Tech Stack:** Next 16.4.2 (App Router), React 19.3.1 (`ViewTransition`), Tailwind 4, plain CSS.

**Spec:** [docs/superpowers/specs/2026-10-23-load-in-animations-design.md](../specs/2026-10-23-load-in-animations-design.md) — read it first; its "Known risks" section records the pre-implementation spike results.

## Global Constraints

- Read the relevant doc in `node_modules/next/dist/docs/` before Next work (`01-app/02-guides/view-transitions.md` for this plan).
- Frontend only. No schema, Studio, dependency or generated-type changes. No animation library.
- Only `opacity`, `transform` and `filter` animate. Text must be visible with no JS.
- Word cascade values: 800ms, `cubic-bezier(.22,1,.36,1)`, 45ms per word, rise `.4em`, blur `6px`, delay index capped at 14. Soft handoff: old content fades and drops 8px in 180ms.
- Tokens are CSS variables in `frontend/css/motion.css`, imported from `css/globals.css`. Don't restate values elsewhere.
- Builds need `NODE_ENV=production` (this shell exports `development`, which breaks `next build` on `/_global-error`). Test view transitions in real Chrome (the in-app browser pane never completes a transition) against `NODE_ENV=production npx next start -p 3107`.
- Verification (repo rule): `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend` before claiming done. Stop any dev/prod server you started.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Deferred work gets a GitHub issue (`gh issue list --search` first); link it from the spec's Deferred section.

## Review Focus

1. A heading whose text carries Sanity stega characters (Presentation) must render whole, not split. Pinned in Task 2.
2. Empty, `null` or whitespace-only heading renders nothing, never an empty `<h1>`. Task 2.
3. A 40-word headline must not take over a second to finish. Task 2 (index cap).
4. Splitting must not change the text: joining the words with single spaces equals the normalized original. Task 2.
5. Reduced-motion and print users must see final text with no hidden start state. Task 3 (`verifyMotionCss`).
6. Internal-href test must treat `/x?y#z` as internal and `mailto:`, `tel:`, `https://…`, `//host/x`, `#anchor` as not. Task 6.
7. Presentation (draft mode) navigation must not break with `<ViewTransition>` present. Manual check, Task 7.

---

### Task 1: Morph investigation (go/no-go)

Why first: the pre-implementation spike showed React applying no names to a matching card/hero pair. The rest of the plan assumes the answer; Task 5 depends on it.

**Files:**
- Create (throwaway, delete in the last step): `frontend/app/vt-spike/[id]/page.tsx`
- Modify: `docs/superpowers/specs/2026-10-23-load-in-animations-design.md` (record the finding)

**Interfaces:**
- Produces: a written verdict in the spec's "Known risks": `MORPH: GO — <the wiring rule that works>` or `MORPH: NO-GO — <why>`. Task 5 consumes it.

- [ ] **Step 1: Write the isolated repro.** `/vt-spike/a` and `/vt-spike/b`, each a server page with a `<Link>` to the other and a 300×200 `div` wrapped in `<ViewTransition name="spike-box">` (docs Step 1 form). No site components.
- [ ] **Step 2: Build and serve.** `cd frontend && NODE_ENV=production npx next build && NODE_ENV=production npx next start -p 3107` (background).
- [ ] **Step 3: Probe in real Chrome** (Claude in Chrome; open `http://localhost:3107/vt-spike/a`). Wrap `document.startViewTransition` so that after `transition.ready` it records `[...new Set(document.getAnimations().map(a => a.effect?.pseudoElement).filter(Boolean))]`, click the link, wait 3s. **Pass = the list contains `::view-transition-group(spike-box)`.**
- [ ] **Step 4: Branch on the result.**
  - Isolated pair fails → the stack, not site code, blocks morphs. Read the view-transitions guide and `link.md` again for a missed requirement (e.g. a boundary that must exist on the updating route segment, or a `<ViewTransition>` required in the layout). Try each candidate against the isolated repro until it passes or the list is exhausted. Exhausted → verdict NO-GO.
  - Isolated pair passes → bisect toward the real pair on the same probe, changing one thing per build: (a) `CardProperty` rendered on a server page (`PropertiesPreviewView` on a property page) instead of the lazily hydrated archive; (b) the detail hero inside vs outside `PropertyIntro`; (c) the card's `Link` wrapper vs the named element's position; (d) both elements' sizes/positions in view at click time. Record which change made `::view-transition-group(property-<slug>)` appear.
- [ ] **Step 5: Record the verdict** in the spec's Known risks (replace the "Cause not found" sentence), with the exact wiring rule if GO.
- [ ] **Step 6: Clean up.** Stop the server, delete `app/vt-spike`, `git status` shows only the spec change.
- [ ] **Step 7: Commit.** `git add docs/superpowers/specs/2026-10-23-load-in-animations-design.md && git commit -m "docs: morph investigation verdict"`

---

### Task 2: Cascade splitting and component

**Files:**
- Create: `frontend/sanity/lib/cascade.ts`
- Create: `frontend/components/Cascade.tsx`
- Test: `frontend/scripts/verifyCascade.mts`

**Interfaces:**
- Produces:
  - `export const CASCADE_MAX_INDEX = 14`
  - `export function cascadeWords(text: string | null | undefined): string[] | null` — words split on whitespace, empty entries removed. Returns `null` when there is nothing to render (empty or whitespace-only) **or** when `stegaClean(text) !== text`.
  - `export default function Cascade(props: {as?: 'h1' | 'h2' | 'h3' | 'p'; className?: string; text: string | null | undefined})` — server component. Renders nothing when `text` is empty. When `cascadeWords` returns `null` for a non-empty string (stega), renders the element with the unsplit text. Otherwise renders the element containing `<span className="cascade-word" style={{'--i': Math.min(i, CASCADE_MAX_INDEX)}}>word</span>` per word with a plain `' '` text node between spans.

- [ ] **Step 1: Write `scripts/verifyCascade.mts`** in the style of `scripts/verifyShare.mts` (imports the real helper, `same()` helper, non-zero exit on failure). Assertions:
  - `cascadeWords('Protecting open spaces')` equals `['Protecting', 'open', 'spaces']`
  - `cascadeWords('  a   b\n c ')` equals `['a', 'b', 'c']` and `cascadeWords(…)!.join(' ')` equals `'a b c'` (Review Focus 4)
  - `cascadeWords('')`, `cascadeWords('   ')`, `cascadeWords(null)`, `cascadeWords(undefined)` all equal `null` (Review Focus 2)
  - a 40-word string returns 40 words (the cap is on the index, asserted via `CASCADE_MAX_INDEX === 14`) (Review Focus 3)
  - a stega string returns `null` (Review Focus 1). Build it with `vercelStegaCombine('Hello world', {origin: 'sanity.io', href: '/x'})` from `@vercel/stega` (a dependency of `next-sanity`; if it does not resolve from `frontend`, import it via the path `next-sanity` resolves, and note which in the script header).
- [ ] **Step 2: Run it, expect FAIL** (module not found): `cd frontend && node scripts/verifyCascade.mts`
- [ ] **Step 3: Implement `cascadeWords`** in `sanity/lib/cascade.ts` using `stegaClean` from `next-sanity`; the stega test is `stegaClean(text) !== text`.
- [ ] **Step 4: Implement `Cascade.tsx`** to the interface above. Follow the existing server-component style (see `components/PageHeader.tsx`).
- [ ] **Step 5: Run it, expect PASS** with every line `ok`.
- [ ] **Step 6: Commit.** `git add frontend/sanity/lib/cascade.ts frontend/components/Cascade.tsx frontend/scripts/verifyCascade.mts && git commit -m "feat(motion): Cascade component and word splitting"`

---

### Task 3: Motion CSS and its guard

**Files:**
- Create: `frontend/css/motion.css`
- Modify: `frontend/css/globals.css` (add `@import './motion.css';` with the other imports)
- Test: `frontend/scripts/verifyMotionCss.mts`

**Interfaces:**
- Consumes: class `cascade-word` and its `--i` variable from Task 2.
- Produces: classes `.cascade-word`, `.load-in` (plain fade; optional `--load-in-step` variable, default 0, adds `step × 120ms` to its delay), and the transition classes `.page-out`, `.page-in` used by Task 4; tokens `--motion-duration: 800ms`, `--motion-ease: cubic-bezier(.22,1,.36,1)`, `--cascade-step: 45ms`, `--cascade-rise: .4em`, `--cascade-blur: 6px`.

- [ ] **Step 1: Write `scripts/verifyMotionCss.mts`.** Reads `css/motion.css` as text and asserts: every `animation` / `animation-name` declaration and every `::view-transition-*` animation rule sits inside an `@media (prefers-reduced-motion: no-preference)` block, and the file contains a `@media print` rule or the no-preference block is `screen`-qualified, so reduced-motion and print users never get a hidden start state (Review Focus 5). Also asserts the tokens above exist with the spec's values.
- [ ] **Step 2: Run, expect FAIL** (file missing).
- [ ] **Step 3: Write `motion.css`.** Keyframes per the Global Constraints values. `.cascade-word` is `display:inline-block`; its delay is `calc(var(--i) * var(--cascade-step))`. (No navigation-delay rule: an `:active-view-transition` delay would retroactively shift running animations; the page-in delay already hides the new page for 180ms.) `.load-in` delay lands after the headline: `calc(var(--cascade-step) * 8 + var(--load-in-step, 0) * 120ms)`. View-transition rules: `::view-transition { pointer-events: none }` (unconditional is fine, it carries no animation), `.page-out`/`.page-in` keyframes for the soft handoff (180ms fade + 8px drop out; fade in delayed by the exit), and the header-anchor rules from the Next guide for `site-header` (`::view-transition-group(site-header){animation:none;z-index:100}`, `-old` `display:none`, `-new` `animation:none`).
- [ ] **Step 4: Import it** in `globals.css`.
- [ ] **Step 5: Run, expect PASS.** Then `cd frontend && npm run type-check` passes.
- [ ] **Step 6: Commit.** `git add frontend/css/motion.css frontend/css/globals.css frontend/scripts/verifyMotionCss.mts && git commit -m "feat(motion): motion tokens, keyframes and view-transition CSS"`

---

### Task 4: Apply load-in to first-screen text

**Files (modify):** `components/PageHeader.tsx`, `components/blocks/Hero.tsx`, `components/blocks/HeroImage.tsx`, `components/blocks/HeroSecondary.tsx`, `components/blocks/HeroTertiary.tsx`, `components/HeroVideo.tsx`, `components/PropertyView.tsx`, `components/EventView.tsx`, `components/ArticleView.tsx`, `components/ProjectView.tsx` (its title is the `heading` prop passed to `JumpNavLayout`; add a `headingNode` or equivalent minimal change there so the heading uses `<Cascade>`).

**Interfaces:**
- Consumes: `<Cascade as className text>` (Task 2), `.load-in` / `--load-in-step` (Task 3).

- [ ] **Step 1: Replace each headline `<h1 className="…">{x}</h1>`** with `<Cascade as="h1" className="…" text={x} />`, keeping classes and the conditional (`{x && …}`) unchanged. Where a block has no `<h1>` of its own (check `HeroSecondary`, `HeroTertiary`, `HeroVideo`), leave its headline alone and only add `load-in` below.
- [ ] **Step 2: Add `load-in` to that hero's eyebrow, body and button elements** via `className` (pass it to `Eyebrow`/`ButtonLink` through their existing `className` prop). Don't edit `Eyebrow` itself: it renders below the fold elsewhere.
- [ ] **Step 3: Verify** `cd frontend && npm run type-check && npm run lint`.
- [ ] **Step 4: Verify in the browser.** Start `next dev` on a free port (check what is running first), open a hero page (`/about-us/conservation`) and a property page; confirm the cascade plays on load, text is final-visible after ~1.5s, and `textContent` of each `h1` equals the CMS text. Stop the server.
- [ ] **Step 5: Commit.** `git commit -am "feat(motion): cascade first-screen headlines and fade the rest"`

---

### Task 5: Page transitions (soft handoff, header anchor, optional morph)

**Files:**
- Create: `frontend/components/PageTransition.tsx`
- Modify: `app/page.tsx`, `app/[...slug]/page.tsx`, `app/news/[slug]/page.tsx`, `app/events/[slug]/page.tsx`, `app/projects/[slug]/page.tsx`, `app/properties/[slug]/page.tsx`, `app/search/page.tsx` (wrap the returned JSX)
- Modify: `components/header/HeaderShell.tsx` (give the `<header>` `style={{viewTransitionName: 'site-header'}}`)
- Modify (only if Task 1 verdict is GO): `components/cards/CardProperty.tsx`, `components/cards/CardProject.tsx`, `components/cards/CardNews.tsx`, `components/PropertyView.tsx`, `components/ProjectView.tsx`, `components/ArticleView.tsx`

**Interfaces:**
- Consumes: `.page-out` / `.page-in` and the `site-header` rules (Task 3); the wiring rule recorded by Task 1.
- Produces: `export default function PageTransition({children}: {children: React.ReactNode})` rendering `<ViewTransition enter="page-in" exit="page-out" default="none">{children}</ViewTransition>`.

- [ ] **Step 1: Implement `PageTransition`** to the signature above.
- [ ] **Step 2: Wrap each of the seven pages' returned JSX** (wrapper inside `page.tsx`, never the layout: layouts persist, so enter/exit never fire there).
- [ ] **Step 3: Anchor the header** with the inline `viewTransitionName`. The header is `sticky` and hides on scroll; confirm in Chrome that this does not make it flash during a transition.
- [ ] **Step 4: If Task 1 = GO,** wrap each card image and its detail hero in `<ViewTransition name={`<type>-${slug}`} …>` using exactly the rule Task 1 recorded (including whether `share`/`default` are used), for properties, projects and news. Skip people/staff cards. If NO-GO, skip this step and add a line to the spec's Deferred section.
- [ ] **Step 5: Verify in real Chrome** on a production build: navigate between two ordinary pages (`document.getAnimations()` after `ready` contains `::view-transition-old(…)`/`new` for the page boundary and no group for `site-header` motion); with Chrome's rendering emulation set to `prefers-reduced-motion: reduce`, navigation swaps instantly. If GO, confirm `::view-transition-group(property-<slug>)` appears on card → detail and on back.
- [ ] **Step 6: Verify** `npm run type-check && npm run lint`, then commit. `git commit -am "feat(motion): route transitions with header anchor"`

---

### Task 6: Internal links use `<Link>`

**Files:**
- Create: `frontend/components/ui/AnchorLink.tsx` and its pure helper `isInternalHref` in `frontend/sanity/lib/links.ts` (first `grep -n "internal\|startsWith('/')" frontend/sanity/lib/utils.ts`; reuse an existing helper instead of adding one if it already does this)
- Modify: `components/ui/ButtonLink.tsx`, `components/ui/LinkButton.tsx`, `components/ui/LinkRow.tsx`, `components/Footer.tsx`, `components/search/SearchResults.tsx`, `components/blocks/ProjectPreviewView.tsx`, `components/cards/CardProject.tsx`
- Test: `frontend/scripts/verifyLinks.mts`

**Interfaces:**
- Produces:
  - `export function isInternalHref(href: string): boolean` — true for site-relative paths (`/x`, `/x?y=1#z`); false for `#anchor`, `mailto:`, `tel:`, `http(s)://…`, `//host/x`, empty.
  - `export default function AnchorLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {href: string})` — renders `next/link` `<Link>` when `isInternalHref(href)` and `target` is not `_blank`, otherwise a plain `<a>`.

- [ ] **Step 1: Write `scripts/verifyLinks.mts`** with the cases in Review Focus 6, plus `isInternalHref('/news?tag=a#b') === true`.
- [ ] **Step 2: Run, expect FAIL.** `cd frontend && node scripts/verifyLinks.mts`
- [ ] **Step 3: Implement** the helper and `AnchorLink`.
- [ ] **Step 4: Swap** the seven components' `<a href=…>` for `<AnchorLink>`, leaving `target`/`rel` handling and classes unchanged. Do not touch `PortableText`, `SocialLinks`, `DownloadBlock`, `JumpNavLayout` (external, file or in-page links), or `MapboxMap`'s HTML-string popup.
- [ ] **Step 5: Run `verifyLinks.mts`, expect PASS;** `npm run type-check && npm run lint`.
- [ ] **Step 6: Commit.** `git commit -am "feat(motion): internal links go through next/link so transitions and prefetch apply"`

---

### Task 7: Whole-branch verification, docs and issues

- [ ] **Step 1: Full checks.** `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`; `node scripts/verifyCascade.mts`, `node scripts/verifyMotionCss.mts` and `node scripts/verifyLinks.mts` each exit 0 (three separate runs).
- [ ] **Step 2: Production build** (`NODE_ENV=production npx next build`) succeeds; route table still shows detail routes SSG.
- [ ] **Step 3: Real-Chrome pass** on `next start -p 3107`: cascade on a hero page and a detail page; soft handoff between pages; morph (if GO); reduced motion emulated shows static text and instant swaps; header never moves. Record LCP and CLS for `/about-us/conservation` and `/` with and without `motion.css` imported (median of 5), expecting no meaningful change.
- [ ] **Step 4: Presentation check.** In Studio Presentation (draft mode), confirm a headline with stega renders unsplit, click-to-edit overlays still work, and in-iframe navigation still works with `<ViewTransition>` present (Review Focus 7). If Studio can't be run, say so in the PR.
- [ ] **Step 5: Docs.** Add a durable-decision entry to `docs/DECISIONS.md` (section 4: motion tokens live in `motion.css`; `<Cascade>` is opt-in per headline; `<PageTransition>` belongs in `page.tsx`, never a layout; internal links use `<Link>`). Update the spec's Status line from "proposed. Nothing built." to what shipped.
- [ ] **Step 6: Issues.** `gh issue list --search "scroll cascade"`, then file: scroll-in cascade (deferred "B"); the morph, if NO-GO (what was tried, the verdict); comment on #53 that this supersedes it. Link the numbers from the spec's Deferred section.
- [ ] **Step 7: Stop servers** (any `next dev`/`next start` you started, and the brainstorming companion via its `stop-server.sh`). Commit docs, push the branch, open a PR whose body states what was and was not verified (Safari/Firefox, Presentation if skipped).
