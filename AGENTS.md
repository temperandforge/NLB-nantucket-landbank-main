<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Project rules

Conventions this project has committed to. The reasoning behind each, and its implementation
status, is in [docs/DECISIONS.md](docs/DECISIONS.md) — read the relevant entry before changing
anything it covers. Record new durable decisions there; don't let this file become the record.

Design docs live in [docs/superpowers/specs/](docs/superpowers/specs/).

## Sanity schema

- **Only singletons get explicit `_id`s.** Everything else lets Sanity generate one. Wire
  relationships with `reference` fields, or with the `_id` a create call returns. Singletons are
  enforced in Structure via `S.document().documentId(...)` — there is no schema-level option.
- **Menus are standalone `menu` documents, referenced.** Never inline menu items onto a page or
  singleton.
- **A menu item is `menuGroup` (heading + children) or `menuLink` (label + link).** Two types, so
  invalid half-states can't be authored. Nesting is capped at two levels.
- **Reuse the shared `link` object** rather than adding a parallel link shape.
- **Compute derivable values at render** instead of storing them (e.g. the copyright year).
- **Constrain singleton queries by `_type` as well as `_id`** — `_id` alone widens the generated
  type to a union with an all-null variant.
- **Categorisation is referenced documents, not union types.** `propertyType` and `resource` are
  documents so the client can extend them without a deploy. Never restate their values in frontend
  code — derive from the generated query types.
- **A taxonomy's slug is its stable key; its title is the label.** URL filters use the slug, so
  renaming a title is safe and changing a slug breaks shared links.

## Projects and the map

- **`project` is a Land Bank property** — the things on the interactive map. It replaced the
  hardcoded `frontend/app/map/properties.ts`.
- **Boundary geometry is not stored per project.** One GeoJSON FeatureCollection on
  `projectSettings.boundaryData` holds every boundary; a project stores only `boundaryIds`, an
  array naming one or more features since a project may span more than one.
- **Which feature property holds the identifier is configurable** (`boundaryIdProperty`). The file
  is the client's, so never hardcode a key like `MAP_ID`.
- **Replacing the boundary file does not re-point any project.** Re-check assignments afterwards;
  the `BoundaryIdsInput.tsx` component flags any value that is no longer in the file.
- **Nothing draws until Mapbox fires `load`.** That needs the style request to `api.mapbox.com` to
  succeed, so a dev server without `NEXT_PUBLIC_MAPBOX_TOKEN` shows an empty canvas with controls.
  An empty map is not evidence the data is wrong — verify map *data* separately from *rendering*.
- **A project's marker and its boundary must share one feature id.** Hover linkage uses
  `setFeatureState`; deriving the id from a separate index over only projects that have geometry
  makes hovering highlight the wrong polygon as soon as one project has no boundary.

## Page URLs

- **`page.slug` is a single segment.** The full path is derived from the `parent` chain, never
  authored. Slashes in a slug are rejected.
- **`parent` is a reference to another `page`.** An ancestor must be *published* — a draft-only
  ancestor resolves to null in the published perspective and silently breaks every descendant URL.
- **`pathOnly` pages are path segments, not pages.** They contribute their slug to descendants
  and return 404 at their own URL.
- **Maximum depth is 3 segments** (two ancestors). GROQ can't recurse, so the depth is fixed in
  two places that can't share code across packages: `MAX_PAGE_DEPTH` /
  `PAGE_PRESENTATION_ROUTES` in `studio/src/lib/pageHierarchy.ts`, and the `pagePath` expression
  in `frontend/sanity/lib/queries.ts`. Change both, then re-run `verifyPageRouting.ts`.
- **The path expression lives in one shared constant per package.** On the frontend, reuse
  `pagePath` for the page lookup, `generateStaticParams`, the sitemap and the `link` fragment —
  don't re-inline it.
- **A page URL is never derivable from its slug alone.** Don't add a helper that takes a slug and
  returns a page href; it will be wrong for every nested page.
- **Slugs are unique per-sibling**, not globally. Two parents may each have a `history` child.
- **Unmatched paths call `notFound()`.** Never return 200 with a placeholder screen.

## Routing

- **`app/[...slug]` is a catch-all** owning all page paths; `params.slug` is `string[]`. More
  specific routes (`app/posts/[slug]`, `app/map`) still win, so adding a static route above it is
  safe.
- **`link.href` and `socialLink.url` allow relative URLs.** Internal links are site-relative and
  `#` is the placeholder convention; the default `url` validation rejects both.
- **Presentation needs both directions wired** — a `mainDocuments` route per depth (URL →
  document) and `defineLocations` per type (document → URL). Presentation picks a route by
  parameter count. Anchor each with `!defined(...)` at the top of the parent chain or a shallow
  URL resolves to a deeper document, and keep page routes below more specific ones like
  `/posts/:slug`. `defineLocations` `select` does dereference, so `parent->slug.current` works.

## Frontend and design

- **Add design tokens per-feature, named after their Figma variables** (`color/brand/Lowlands` →
  `--color-brand-lowlands`). Don't import the whole design system speculatively. The
  Sanity-starter tokens still in `globals.css` are in use by other pages.
- **Prefer an existing token over raw hex from a Figma export** when they nearly match, and flag
  the discrepancy.
- **Commit Figma assets; never hotlink them** — the URLs expire in about a week. Icons become
  inline SVG components using `currentColor`; large artwork stays a file in `public/`.
- **Preserve each icon's own geometry.** Never apply one size to unlike icons or use `size-full`
  inside a larger box.
- **Anything rendered site-wide must degrade, never throw.** Guard each region independently;
  references can always be unpublished.
- **Ship unbuilt interactive features disabled**, and record the gap in the spec's deferred
  section. An enabled form that does nothing reads as a bug.

## Content scripts

- **Run seeds and migrations via `cd studio && npx sanity exec scripts/<name>.ts
  --with-user-token`.** This authenticates as the logged-in CLI user, so no write token needs to
  exist in the environment.
- **Make them idempotent** — match existing documents on a natural key and reuse them.
- **State what a script overwrites in its header.** The footer seed uses `createOrReplace` and
  discards Studio edits to the footer; pages are never overwritten.
- **Give anything that rewrites existing documents a `--dry` mode**, and read the plan before the
  real run.
- **Don't filter with a GROQ `match` glob to test for a character.** `match` is word-tokenized,
  not a literal glob — a slash pattern matches slash-free strings too. Filter in JS instead.

## Generated files

`frontend/sanity.types.ts`, `studio/sanity.types.ts` and `sanity.schema.json` are build artifacts
and are tracked. Run `npm run sanity:typegen` in `frontend` after any schema change and commit
the result. Derive component prop types from the generated query result types (see
`frontend/sanity/lib/types.ts`) so they can't drift from the GROQ projection.

## Placeholders

Use `#` for a link whose real path isn't known yet, and create no page for it. Never invent a
plausible external URL to fill a gap — say what's outstanding instead.

## Verification

No test framework exists. Before claiming work is done, run `npm run sanity:typegen`,
`npm run type-check` and `npm run lint` in `frontend`, and `npx tsc --noEmit` in `studio`.
For anything visual, verify in the browser rather than asking the user to check.

After changing the page hierarchy, routes or Presentation config, also run:

```bash
cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token
```

Where a contract depends on document data rather than code, add a script like that one — the
compiler can't catch it. Import the definitions under test instead of restating them, or the check
drifts from the thing it checks.
