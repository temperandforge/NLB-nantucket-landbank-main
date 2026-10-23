# Redirects

Status: proposed. Nothing built. Umbrella issue: [#9](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/9).

## Goal

Old URLs that people have bookmarked, linked or had indexed keep working. Editors manage redirects in
Studio with no deploy, and the common case, renaming or moving a page, needs no manual work: Studio
creates the redirects itself.

Three cases motivated this (#9): renamed or moved pages change every descendant's URL (DECISIONS 2.3);
the landing page is reachable at both `/` and its own path; and the old WordPress site's URLs will need
mapping. The `/map` overlap from #9 is **not** in scope.

## Rules this design follows

- A `redirect` is a document, like `propertyType` and `resource`, so the client can extend it without a
  deploy (DECISIONS 1.7). Only singletons get explicit ids.
- The destination reuses the shared `link` object rather than adding a parallel link shape.
- A page URL is never derivable from its slug alone, so path logic uses the shared `pagePath` constant
  and `pageHierarchy.ts`, never a re-inlined expression.
- Anything running on every request degrades instead of throwing.

## Data model

A new `redirect` document type (`studio/src/schemaTypes/documents/redirect.ts`).

| Field | Type | Notes |
|---|---|---|
| `source` | string | Site-relative path. Must start with `/`. May carry a query string (see Matching). No `*`, no `#`. Stored normalised: lowercase path, no trailing slash. |
| `destination` | `link` | A page reference or a URL. Required unless `statusCode` is 410. Not `#`, `mailto:` or `tel:`. |
| `statusCode` | number (radio) | 301 (default), 302, 303, 307, 308, or 410 Gone. 410 has no destination. |
| `passQuery` | boolean | Default true. Append the incoming query string to the destination. |
| `enabled` | boolean | Default true. |
| `origin` | string | `manual` or `auto`. Read-only, informational. |
| `note` | text | Optional. |

**Auto redirects point at the page reference, not at a path string.** A page renamed twice leaves two
redirects that both resolve to its current URL, so there are no chains to flatten.

### Studio validation

`source` is rejected when it:

- duplicates another redirect's `source`,
- equals the destination's own resolved path (a self-loop),
- is currently a live page path (the page would win anyway, so the rule would be dead),
- starts with a reserved prefix: `/_next`, `/api`, `/studio`.

The list view shows `source` → destination, the status code, and an "auto" badge.

## Matching

Pure module `frontend/sanity/lib/redirectMatch.ts`: `(rules, pathname, search) → rule | null`. No I/O,
so the verify script exercises it directly.

- Exact path. Case-insensitive. Trailing slash ignored. One hop only.
- A `source` **with** a query string matches only when every listed param is present with that value;
  extra params are allowed. This covers WordPress `?p=123` and `?page_id=45` links.
- A `source` **without** one matches the path with any query.
- When several rules match, the one with the most query params wins.
- `passQuery` appends the incoming query to the destination, merged over any query the destination
  already has.
- Only `enabled` rules whose destination resolves are loaded. A page destination that is unpublished or
  `pathOnly` resolves to nothing, so that rule is skipped and the path 404s.

## Applying redirects

`frontend/proxy.ts` (Next 16's replacement for `middleware`; read
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` before writing it).

- Fetches the enabled redirects through a single GROQ query, resolving page destinations with the
  shared `pagePath` constant. The fetch is cached (60 s revalidate, tag `redirect`).
- GET and HEAD only. The matcher excludes `/_next`, `/api` and static files.
- 301/302/303/307/308 return `NextResponse.redirect` with that status. 410 returns a 410 response with
  a minimal body.
- **Fails open:** if the fetch throws, the request passes through unchanged. A broken redirect fetch
  must never take the site down.
- Runs before routes are rendered, so a redirect for a path that is also a live page would shadow it.
  Studio validation prevents authoring one, and the generator disables one when a page takes its path.

## Generating redirects on rename or move

A Sanity Function: `studio/sanity.blueprint.ts` plus `studio/functions/auto-redirect/`. Triggers on
publish of a `page` where `delta::changedAny(slug.current, parent, pathOnly)`; a projection passes the
before and after values.

### The diffing module

`studio/src/lib/redirectDiff.ts`, pure and imported by both the function and the verify script. Input:
the changed page's before and after `{slug, parent chain, pathOnly}` and its descendants. Output: a list
of `{oldPath, pageId}`.

1. Old path from the *before* state, new path from the *after* state, both built with `buildPagePath`
   and bounded by `MAX_PAGE_DEPTH`.
2. Each descendant's old path = its current path with the page's new prefix swapped for the old one.
3. Keep pairs where old differs from new and the destination page is routable (not `pathOnly`).
4. A `pathOnly` page produces redirects for its descendants only: it has no URL of its own.

### The function

For each pair, creates a `redirect` with `origin: "auto"`, `statusCode: 301`, destination = reference to
the page. Then:

- Skips a pair when a redirect with that `source` exists.
- Disables (does not delete) any redirect whose `source` equals a page's new path, so the page wins and
  the history is kept.
- Lets Sanity generate each document's `_id` (only singletons get explicit ids). Idempotency is the
  existence check above; two simultaneous invocations for one source could both pass it, which the
  duplicate-source validation then flags in Studio. That race is accepted.
- Never escapes a slug into GROQ by string interpolation; it passes `$params`.

The `redirect` documents it writes don't match the trigger filter, so there is no recursion.

### Constraints

Free plan. Functions quota is about 500K invocations and 20K GB-seconds a month, and this trigger fires a
handful of times, so cost is effectively nil. Rate limits (200 invocations per 30 s per function) could
throttle a bulk re-parent of many pages, and the docs don't say whether blocked runs are retried. They
are logged and admins notified. Delivery and retry guarantees are undocumented, so a missed run means a
missing redirect and nothing notices.

**Step zero of implementation is a throwaway `sanity blueprints init` and `deploy`** to confirm the
project's plan accepts a Function. If it does not, fall back to a Studio publish action calling the same
`redirectDiff.ts`; only the thin wrapper changes. Deploy is separate from the frontend and Studio deploys
and is per dataset, so it is documented in `studio/README.md`.

## Landing page

The page chosen in Site Settings renders at `/` and is also reachable at its own path. A request to that
own path returns a 301 to `/`. This is derived in `app/[...slug]/page.tsx` from the same
`landingPageQuery` that already supplies the page, not authored as a `redirect` document, so it cannot
drift when the landing page changes.

## Verification

No test framework exists (AGENTS.md). Added:

- Three scripts, following the repo's split between pure checks and dataset checks. Each imports the
  module under test rather than restating it.
  - `frontend/scripts/verifyRedirectMatch.mts` (`cd frontend && node scripts/verifyRedirectMatch.mts`):
    exact, case, trailing-slash and encoded-path matching, query-string matching and precedence,
    `passQuery` merging, 410, a disabled rule.
  - `studio/scripts/verifyRedirectDiff.ts` (`npx sanity exec scripts/verifyRedirectDiff.ts`, no dataset):
    rename of a leaf, rename of an ancestor with descendants at depths 2 and 3, re-parent, `pathOnly`
    rename, no-op change, first publish, rename-and-rename-back, existing-source skip.
  - `studio/scripts/verifyRedirects.ts` (`npx sanity exec scripts/verifyRedirects.ts
    --with-user-token`, read-only): no stored `source` collides with a live page path, and every
    enabled redirect has a destination that resolves or is a 410.
- `curl -I` against a dev server for 301, 302, 410, `?p=123` and the landing-page path.
- The standard gates: `npm run sanity:typegen`, `npm run type-check` and `npm run lint` in `frontend`,
  `npx tsc --noEmit` in `studio`. Generated types are committed.

The function's live trigger can only be tested after a deploy; locally it runs through
`sanity functions test`.

## Documentation

A DECISIONS entry (section 2, beside 2.3 and 2.7), a link from DECISIONS 2.3's "Add redirects if the old
URLs were public" and 11.1's note, and a comment on #9 closing the three cases it lists.

## Deferred

Each has an issue; none is built.

- Pattern (`:param`, `*`) and regex rules: [#72](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/72)
- Studio warning before a rename or move breaks URLs: [#73](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/73)
- Hit logging and a 404 log: [#74](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/74)
- Deleted and unpublished pages: [#75](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/75)
- Bulk import of the old WordPress URLs: [#76](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/76)

Also not carried over from the WordPress Redirection plugin: conditional matching on login, referrer,
user agent or language; random and pass-through actions; groups; CSV import and export.
