# Redirects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editors manage redirects in Studio, redirects are created automatically when a page is renamed or moved, and the frontend applies them before routing.

**Architecture:** A `redirect` document type (Studio) is read by a cached GROQ fetch in `frontend/proxy.ts` and matched by a pure module. A Sanity Function runs on page publish, uses a pure diffing module to work out which URLs changed (the page and its descendants), and creates `origin: "auto"` redirects that point at page references.

**Tech Stack:** Next 16 (`proxy.ts`), Sanity Studio 5, GROQ, Sanity Functions and Blueprints (`@sanity/blueprints`, `@sanity/functions`, `@sanity/client`), plain `node` / `sanity exec` verify scripts (no test framework).

**Spec:** [docs/superpowers/specs/2026-10-23-redirects-design.md](../specs/2026-10-23-redirects-design.md)

**Branch:** `feat/redirects` (already created).

## Global Constraints

- Read the relevant doc in `node_modules/next/dist/docs/` before any Next.js work (AGENTS.md). For `proxy.ts`: `01-app/03-api-reference/03-file-conventions/proxy.md`.
- Only singletons get explicit `_id`s. Auto redirects let Sanity generate theirs.
- Destination reuses the shared `link` object. No parallel link shape.
- Path building uses `buildPagePath` / `MAX_PAGE_DEPTH` from `studio/src/lib/pageHierarchy.ts` and `pagePath` in `frontend/sanity/lib/queries.ts`. Never re-inline either. Do not add a third copy of the path GROQ expression.
- Status codes: 301 (default), 302, 303, 307, 308, 410. 410 has no destination.
- `source`: starts with `/`, may carry a query string, no `*`, no `#`; stored lowercase with no trailing slash (root stays `/`). Reserved prefixes rejected: `/_next`, `/api`, `/studio`.
- `passQuery` default true; `enabled` default true; `origin` is `manual` or `auto`, read-only.
- Matching: exact path, case-insensitive, trailing slash ignored, one hop. Query-string sources match when every listed param is present; most params wins.
- Proxy: GET and HEAD only, fails open, fetch cached (60 s revalidate, tag `redirect`).
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are tracked: run `npm run sanity:typegen` in `frontend` after any schema change and commit the result.
- Verification gates before claiming done: `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in `studio`. Stop any dev server you started.
- Commit messages follow the repo style (`feat(redirects): ...`) and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Writes to the Sanity dataset (test documents, deploys) need the user's go-ahead first; say which dataset.

## Review Focus

Inputs the spec implies but its own tests would not catch; each is pinned by a named test in the owning task.

1. A request or stored source that differs only by case, trailing slash, `%20`-style encoding or a double slash must still match (Task 3).
2. A page renamed A→B then back B→A: the old A redirect must be disabled (the page wins) and a B redirect created, not a loop (Task 6).
3. A rule whose destination page is unpublished or `pathOnly` must produce no redirect, so the path 404s rather than redirecting to a 404 (Task 4).
4. An external destination that already has a query string, with `passQuery` on, must merge the incoming query rather than append a second `?` (Task 3).
5. A page's first publish at a path that already has a redirect must disable that redirect (Task 6).

---

### Task 1: Confirm Functions deploy on this project

This is a gate. It needs the user at the keyboard (Sanity login and deploy). Nothing later depends on the files it creates, but the result decides whether Tasks 6 and 7 build a Function or a Studio publish action.

**Files:**
- Create (throwaway, delete afterwards): `studio/sanity.blueprint.ts`, `studio/functions/probe/index.ts`

**Interfaces:**
- Produces: a recorded answer to two questions, written into the spec's Constraints section: (a) does `sanity blueprints deploy` succeed on the Free plan; (b) does the function bundler follow a relative import from outside the function directory (`../../src/lib/pageHierarchy`).

- [ ] **Step 1: Ask the user to run the probe.** Create a no-op document function (`on: ['publish']`, filter `_type == "page"`) whose handler imports `buildPagePath` from `../../src/lib/pageHierarchy` and logs `buildPagePath(['a','b'])`. Use `defineBlueprint` / `defineDocumentFunction` from `@sanity/blueprints` and `documentEventHandler` from `@sanity/functions`. Install the three packages in `studio`.
- [ ] **Step 2: Ask the user to run** `cd studio && npx sanity blueprints init` then `npx sanity blueprints deploy`, then publish any page and read `npx sanity functions logs probe`. Expected: deploy succeeds; the log shows `a/b`.
- [ ] **Step 3: Record the outcome** in the spec's Constraints section. If (a) fails, stop and tell the user: Task 7 becomes a Studio publish action instead. If (b) fails, Task 7 copies `buildPagePath` into the function directory with a comment pointing at `pageHierarchy.ts`.
- [ ] **Step 4: Remove the probe** (`functions/probe`, and the blueprint file if the real one will replace it), undeploy with `npx sanity blueprints destroy` only if the user asks, and commit the spec note: `docs(redirects): record Functions deploy result`.

---

### Task 2: The `redirect` document and its Studio surface

**Files:**
- Create: `studio/src/lib/redirectSource.ts`
- Create: `studio/src/schemaTypes/documents/redirect.ts`
- Create: `studio/scripts/verifyRedirectSource.ts`
- Modify: `studio/src/schemaTypes/index.ts` (import and add `redirect` to `schemaTypes`)
- Modify: `studio/src/structure/index.ts` (add `'redirect'` to `DISABLED_TYPES`; add a "Redirects" list item beside Pages using `S.documentTypeListItem('redirect')`)
- Regenerate: `sanity.schema.json`, `studio/sanity.types.ts`, `frontend/sanity.types.ts`

**Interfaces:**
- Produces, in `redirectSource.ts`:
  - `RESERVED_PREFIXES: readonly string[]` = `['/_next', '/api', '/studio']`
  - `STATUS_CODES: readonly [301, 302, 303, 307, 308, 410]`
  - `normaliseSource(source: string): string`: lowercases the path, strips a trailing slash (root stays `/`), keeps the query string as written.
  - `validateSourceShape(source: string | undefined): true | string`: returns an editor-facing message, or `true`. Checks in this order: required, starts with `/`, no `#`, no `*`, no reserved prefix.
- Schema type name `redirect`; fields `source`, `destination` (`link`), `statusCode` (number, radio, initial 301), `passQuery`, `enabled`, `origin` (readOnly), `note`.

- [ ] **Step 1: Write the failing verify script** `studio/scripts/verifyRedirectSource.ts`, in the style of `verifyGeoConversion.ts` (a `check()` helper, non-zero exit on failure). Assertions:
  - `normaliseSource('/About-Us/Staff/') === '/about-us/staff'`; `normaliseSource('/') === '/'`; `normaliseSource('/Old?P=1') === '/old?P=1'`.
  - `validateSourceShape('old')` is a string (no leading slash); `'/a#b'`, `'/a/*'`, `'/api/x'`, `'/_next/x'`, `'/studio'`, `''`, `undefined` are strings; `'/old'` and `'/?p=123'` are `true`.
- [ ] **Step 2: Run** `cd studio && npx sanity exec scripts/verifyRedirectSource.ts`. Expected: fails to import `../src/lib/redirectSource`.
- [ ] **Step 3: Implement `redirectSource.ts`** to satisfy Step 1.
- [ ] **Step 4: Run Step 2's command.** Expected: all `ok`.
- [ ] **Step 5: Implement `redirect.ts`.** Validation on `source`, in order: `validateSourceShape`, then three async checks using `context.getClient({apiVersion: '2025-09-25'})`:
  1. duplicate: another `redirect` (excluding self and its draft, as `page.ts` does with `publishedId`) whose `normaliseSource(source)` equals this one; compare in JS, not with GROQ `match`;
  2. live page path: fetch pages whose `slug.current` equals the source path's last segment, project with `PAGE_LOCATION_SELECT` and `previewPathToGroq` from `pageHierarchy.ts`, build the path with `buildPagePath`, skip `pathOnly`, compare to the source's path (query string ignored);
  3. self-loop: when `destination.linkType === 'page'`, resolve that page's path the same way and reject if it equals the source path.
  `destination` is required unless `statusCode === 410` and hidden when it is 410; reject `#`, `mailto:` and `tel:` hrefs. The stored `source` is kept as the editor typed it; every comparison (validation, matcher, function) goes through `normaliseSource`. The list preview is `title: source`, `subtitle:` status code plus destination, with an "auto" marker when `origin === 'auto'`.
- [ ] **Step 6: Register and list.** Edit `index.ts` and `structure/index.ts` as listed.
- [ ] **Step 7: Regenerate types.** Run `npm run sanity:typegen` in `frontend`. Expected: `redirect` appears in `frontend/sanity.types.ts`.
- [ ] **Step 8: Gates.** `cd studio && npx tsc --noEmit`; `cd frontend && npm run type-check && npm run lint`. Expected: clean.
- [ ] **Step 9: Verify in Studio.** Start `sanity dev` (check the port first; stop it afterwards). Create a redirect with `source` `/about-us` where such a page exists: expect the live-page error. Create `/old-thing` → a page: accepted. Create a second `/Old-Thing/`: duplicate error.
- [ ] **Step 10: Commit** `feat(redirects): redirect document type and Studio list`.

---

### Task 3: The matcher

**Files:**
- Create: `frontend/sanity/lib/redirectMatch.ts`
- Create: `frontend/scripts/verifyRedirectMatch.mts`

**Interfaces:**
- Produces, in `redirectMatch.ts`:
  - `type MatchableRule = {source: string; statusCode: 301 | 302 | 303 | 307 | 308 | 410; passQuery: boolean; destination: string | null}`. `destination` is a resolved site path or absolute URL, already null for 410 and for unroutable page destinations.
  - `type RedirectResult = {status: MatchableRule['statusCode']; location: string | null}`
  - `matchRedirect(rules: MatchableRule[], pathname: string, search: string): RedirectResult | null`
- Consumes: nothing. No imports beyond types, so `node` can run the verify script directly.
- The normalisation here mirrors `normaliseSource` in `studio/src/lib/redirectSource.ts`; add a comment in each file pointing at the other, as `pagePath` and `pageHierarchy.ts` do.

- [ ] **Step 1: Write the failing verify script** `frontend/scripts/verifyRedirectMatch.mts` (style of `verifyDates.mts`; import with `.ts` extensions). Assertions, each one `check(...)`:
  - exact: rule `/old` → `/new` (301); `matchRedirect(rules,'/old','')` returns `{status:301, location:'/new'}`; `'/other'` is `null`.
  - **case, slash, encoding, double slash:** `'/OLD/'`, `'/old//'`, `'/%6Fld'` all match `/old`; a source stored as `/Old/` matches `/old`.
  - query-source: rule `/?p=123` → `/news/x` matches `('/', '?p=123')` and `('/', '?p=123&utm=a')` but not `('/', '')` or `('/', '?p=124')`.
  - precedence: with rules `/a` and `/a?x=1`, `('/a','?x=1')` returns the second; `('/a','')` the first.
  - `passQuery`: rule `/old`→`/new` with it on, `('/old','?utm=a')` → `/new?utm=a`; **destination already has a query:** `/new?x=1` plus `?utm=a` → `/new?x=1&utm=a`, one `?`; incoming param overrides a same-named destination param. With `passQuery` off the query is dropped.
  - external destination `https://example.com/p` works the same way.
  - 410: returns `{status:410, location:null}`.
  - a rule with `destination: null` and status 301 is skipped (unroutable page), returning `null`.
  - destination equal to the request's own path (a loop) returns `null`.
- [ ] **Step 2: Run** `cd frontend && node scripts/verifyRedirectMatch.mts`. Expected: fails to import `../sanity/lib/redirectMatch.ts`.
- [ ] **Step 3: Implement `matchRedirect`.** Normalise the request path: percent-decode (a malformed sequence must not throw; fall back to the raw path), collapse repeated `/`, lowercase, strip a trailing slash except root. Parse each rule's `source` into path and required params with `URLSearchParams`; a rule matches when the path is equal and every required param matches. Pick the matching rule with the most required params.
- [ ] **Step 4: Run Step 2's command.** Expected: all `ok`.
- [ ] **Step 5: Commit** `feat(redirects): pure redirect matcher and its verify script`.

---

### Task 4: Fetch the redirects and apply them in `proxy.ts`

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (add `redirectsQuery`)
- Modify: `frontend/sanity/lib/types.ts` (export `RedirectRule` from the generated result type)
- Create: `frontend/proxy.ts`
- Regenerate: `frontend/sanity.types.ts`

**Interfaces:**
- Consumes: `matchRedirect`, `MatchableRule` (Task 3); `pagePath` (private const in `queries.ts`, used in place); `client` from `@/sanity/lib/client`.
- Produces: `export const redirectsQuery` (via `defineQuery`) returning `{source, statusCode, passQuery, destination}[]`, where `destination` is the resolved path or URL string. It is `null` for 410, and `null` for a page destination that is unpublished or `pathOnly`. A page destination is prefixed `/`. Filter: `enabled` coalesced to true, `source` defined.
- `RedirectRule = RedirectsQueryResult[number]` in `types.ts`, assignable to `MatchableRule` (convert `statusCode`/`passQuery` defaults in the query with `coalesce`, so the generated type needs no widening in the matcher).
- `frontend/proxy.ts`: `export async function proxy(request: NextRequest): Promise<NextResponse>` and `export const config = {matcher: [...]}`.

- [ ] **Step 1: Read** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` and the `NextResponse` reference it links. Note the runtime and whether `@/` aliases resolve in `proxy.ts`.
- [ ] **Step 2: Add `redirectsQuery`**, reusing `pagePath`. Run `npm run sanity:typegen` and confirm `RedirectsQueryResult` exists; add `RedirectRule` to `types.ts`.
- [ ] **Step 3: Implement `proxy.ts`.** Wrap the whole body in `try/catch` and return `NextResponse.next()` on any error (fail open). Act only on `GET` and `HEAD`. Fetch with `client.fetch(redirectsQuery, {}, {next: {revalidate: 60, tags: ['redirect']}})`. For a match: 410 → `new NextResponse('Gone', {status: 410})`; otherwise `NextResponse.redirect(new URL(result.location, request.url), result.status)`. Matcher excludes `/_next`, `/api`, and any path with a file extension.
- [ ] **Step 4: Gates.** `cd frontend && npm run type-check && npm run lint`. Expected: clean.
- [ ] **Step 5: Verify against a dev server.** Check what is already on the ports first. With the user's go-ahead on the dataset, create one temporary redirect through a one-off `sanity exec` script (note: `verify-temp`), then run `curl -sI localhost:3000/<source>` and expect `301` with the right `location`. Repeat for 302, for 410, for a disabled rule (expect the normal 404), for a page destination that is unpublished (expect 404, **pins Review Focus 3**), and `HEAD` versus `POST`. Delete the temporary documents and stop the server.
- [ ] **Step 6: Commit** `feat(redirects): apply redirects in proxy.ts`.

---

### Task 5: The landing page's own path redirects to `/`

**Files:**
- Modify: `frontend/app/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `landingPageQuery` (already in `queries.ts`) and its `path` field; `redirect` from `next/navigation`.
- Produces: no new exports.

- [ ] **Step 1: Read** `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` (or the nearest `permanentRedirect` doc). Choose `permanentRedirect` for the 301.
- [ ] **Step 2: Implement.** In `Page`, after the page is found, fetch `landingPageQuery` in the same `Promise.all`. When the landing page's `_id` equals `page._id` and the request is not a draft-mode preview, `permanentRedirect('/')`. Presentation must keep working: skip the redirect when `includeHidden` (draft mode) is true.
- [ ] **Step 3: Gates.** `cd frontend && npm run type-check && npm run lint`.
- [ ] **Step 4: Verify.** With a landing page set in Site Settings, `curl -sI localhost:3000/<its path>` returns 301 to `/`, `/` still returns 200, and Presentation still opens the page. Stop the server.
- [ ] **Step 5: Commit** `feat(redirects): redirect the landing page's own path to /`.

---

### Task 6: Path diffing and the redirect plan (pure)

**Files:**
- Create: `studio/src/lib/redirectDiff.ts`
- Create: `studio/scripts/verifyRedirectDiff.ts`

**Interfaces:**
- Consumes: `buildPagePath`, `MAX_PAGE_DEPTH` from `./pageHierarchy`; `normaliseSource` from `./redirectSource` (Task 2).
- Produces, in `redirectDiff.ts`:
  - `type PageState = {slug: string; pathOnly: boolean; ancestors: string[]}`. `ancestors` are the ancestor slugs outermost first.
  - `type DescendantRef = {id: string; pathOnly: boolean; belowSlugs: string[]}`. `belowSlugs` runs from the child of the changed page down to and including this descendant's own slug.
  - `type PagePathChange = {pageId: string; oldPath: string | null; newPath: string | null}`
  - `diffPagePaths(input: {pageId: string; before: PageState | null; after: PageState; descendants: DescendantRef[]}): PagePathChange[]`. `oldPath` is null when `before` is null or `before.pathOnly`; `newPath` is null when that page's `pathOnly` is true. Only pairs where the two differ are returned. The changed page itself is the entry with empty `belowSlugs`.
  - `type ExistingRedirect = {id: string; source: string}`; `type NewRedirect = {source: string; pageId: string}`
  - `planRedirectWrites(changes: PagePathChange[], existing: ExistingRedirect[]): {create: NewRedirect[]; disable: string[]}`. `create`: changes with both paths set and no existing redirect whose normalised source equals `/` + `oldPath`. `disable`: ids of existing redirects whose normalised source equals `/` + any `newPath`.

- [ ] **Step 1: Write the failing verify script** `studio/scripts/verifyRedirectDiff.ts`. Cases, with exact paths:
  - leaf rename: page `history` under `about-us`→ `our-history`: one change `about-us/history` → `about-us/our-history`.
  - ancestor rename `about-us`→`about`, descendants `staff` (depth 2) and `staff/jobs` (depth 3, `belowSlugs ['staff','jobs']`) plus a `pathOnly` descendant: changes for the page and the two routable descendants, none for the `pathOnly` one.
  - re-parent: the page moves from top level under `explore`.
  - the changed page is `pathOnly` before and after: descendants get changes, the page itself gets none.
  - the page toggles `pathOnly` false→true: its own change has `newPath: null`; `planRedirectWrites` creates nothing for it.
  - no-op: identical before and after returns `[]`.
  - first publish (`before: null`): `oldPath` null; **`planRedirectWrites` disables an existing redirect whose source equals the new path (Review Focus 5).**
  - **rename and rename back (Review Focus 2):** change `b` → `a` with existing `{id:'r1', source:'/a'}`: `create` is `[{source:'/b', pageId}]`, `disable` is `['r1']`.
  - existing source skip: an existing `/a/old` means no duplicate create; matching is case- and slash-insensitive.
  - depth: a descendant whose path would exceed `MAX_PAGE_DEPTH` segments is dropped rather than emitted.
- [ ] **Step 2: Run** `cd studio && npx sanity exec scripts/verifyRedirectDiff.ts`. Expected: fails to import `redirectDiff`.
- [ ] **Step 3: Implement** both functions to satisfy Step 1.
- [ ] **Step 4: Run Step 2's command.** Expected: all `ok`.
- [ ] **Step 5: Gate.** `cd studio && npx tsc --noEmit`.
- [ ] **Step 6: Commit** `feat(redirects): pure path diff and redirect write plan`.

---

### Task 7: The function that writes the redirects

Depends on Task 1's answer. If Task 1 found Functions unavailable, build the same handler as a Studio document action instead (a `DocumentActionComponent` wrapping publish that calls the same two functions); otherwise follow the steps below.

**Files:**
- Create: `studio/sanity.blueprint.ts`
- Create: `studio/functions/auto-redirect/index.ts`
- Modify: `studio/package.json` (add `@sanity/blueprints`, `@sanity/functions`, `@sanity/client` if Task 1 did not)
- Modify: `studio/README.md` (deploy section)

**Interfaces:**
- Consumes: `diffPagePaths`, `planRedirectWrites`, `PageState`, `DescendantRef`, `ExistingRedirect` (Task 6).
- Produces: `export const handler` using `documentEventHandler` from `@sanity/functions`. Blueprint: one document function `auto-redirect`, `on: ['publish']`, filter `_type == "page" && delta::changedAny(slug.current, parent, pathOnly)`, memory 2, timeout 30, projection giving `{id, before: {slug, parentId, pathOnly}, after: {slug, parentId, pathOnly}}` with `before` null on a first publish.

- [ ] **Step 1: Write the blueprint** following the spec's trigger. Client: `createClient({...context.clientOptions, useCdn: false, apiVersion: '2025-05-08'})`.
- [ ] **Step 2: Implement the handler.** Using GROQ with `$params` only (never string-interpolated slugs): fetch the ancestor chains for `before.parentId` and `after.parentId` (published documents, slugs outermost first, bounded by `MAX_PAGE_DEPTH`); fetch the published descendants of the page (children and grandchildren) and derive each `belowSlugs`; fetch existing `redirect` documents (`_id`, `source`); call `diffPagePaths` then `planRedirectWrites`. Create `redirect` documents with `origin: 'auto'`, `statusCode: 301`, `passQuery: true`, `enabled: true`, `destination: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: pageId}}`, no explicit `_id`, in one transaction together with the `enabled: false` patches. Return without writing when both lists are empty. Log what it did.
- [ ] **Step 3: Test locally.** Run `npx sanity functions test auto-redirect` with a sample event for an ancestor rename (add the event JSON under `studio/functions/auto-redirect/` as a fixture) against a dataset the user names. Expected: the logged plan lists the page and each descendant. Do not let this local run write; if the CLI cannot dry-run, pass a stubbed client.
- [ ] **Step 4: Document** in `studio/README.md`: deploy with `npx sanity blueprints deploy`, per dataset, separate from the Studio and frontend deploys; how to read logs; that missed runs leave a missing redirect and nothing flags it.
- [ ] **Step 5: Gate and commit.** `cd studio && npx tsc --noEmit`; commit `feat(redirects): auto-generate redirects on page rename or move`.
- [ ] **Step 6: Ask the user to deploy** and rename a test page under a parent in the real dataset; expected: redirects appear for it and its children, `origin: auto`. Record the result.

---

### Task 8: Dataset check and documentation

**Files:**
- Create: `studio/scripts/verifyRedirects.ts`
- Modify: `docs/DECISIONS.md` (new entry in section 2 after 2.7; amend 2.3's "Add redirects if the old URLs were public", 11.1's "which needs redirects" sentence, and the line near 1109 that says there is no redirect mechanism; leave the `/map` note near 1232 alone, since `/map` is out of scope)
- Modify: `docs/superpowers/specs/2026-10-23-redirects-design.md` (Status: built; fill the Constraints result from Task 1)
- Modify: `AGENTS.md` (one short rule under Page URLs: renames create redirects, the function is deployed separately)

**Interfaces:**
- Consumes: `normaliseSource` (Task 2), `buildPagePath`, `PAGE_LOCATION_SELECT`, `previewPathToGroq` from `pageHierarchy.ts`.

- [ ] **Step 1: Write `verifyRedirects.ts`** in the style of `verifyPageRouting.ts` (`getCliClient`, read-only, non-zero on failure). Checks: no enabled redirect's normalised source path equals a live (non-`pathOnly`) page path; every enabled non-410 redirect's destination is a non-empty href or a page that is published and not `pathOnly`; no two redirects share a normalised source.
- [ ] **Step 2: Run** `cd studio && npx sanity exec scripts/verifyRedirects.ts --with-user-token`. Expected: all `ok` on a dataset with no redirects.
- [ ] **Step 3: Write the DECISIONS entry**, following its existing format (heading, decision, **Why:**, **Implication:**): redirects are documents; auto redirects point at page references; status 410 allowed; patterns and regex deferred (#72).
- [ ] **Step 4: Run the full gates** from Global Constraints, plus `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token`.
- [ ] **Step 5: Comment on #9** with `gh issue comment 9`: which of its three cases are done (renames and landing page: yes; `/map`: out of scope by decision; WordPress paths: #76), and link the PR once open. Close #9 only when the user says so.
- [ ] **Step 6: Commit** `docs(redirects): decision record and dataset verify script`.
