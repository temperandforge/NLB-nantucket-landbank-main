# Map Explorer block (deprecate `/map`)

Status: draft for review.

## Goal

The filterable interactive map is a page-builder block an editor places on the map page entry
(`explore/interactive-map`), instead of a hardcoded `/map` route. The route is removed.

## Decisions made

- **A new `mapExplorer` block**, separate from `mapPreview`. Map Preview stays the lightweight embed
  (heading, body, no filters, scroll-zoom off). Merging them would leave one block with two layouts
  and fields that apply to only one.
- **The block has no text fields.** The page heading and intro come from a Hero Tertiary on the page,
  so `projectSettings.heading` / `intro` / `eyebrow` no longer feed the explorer.
- **`/map` is deleted with no redirect.** Old links 404.
- **`/` with no landing page set calls `notFound()`** instead of redirecting to `/map`.

## Studio

- `studio/src/schemaTypes/objects/mapExplorer.ts`: `defineBlock`, title "Map Explorer", `PinIcon`, no
  fields beyond the shared block fields. Preview subtitle "Map Explorer". Description says it shows
  every property with property-type and resource filters, and that Map Preview is the non-filtering
  variant.
- Register in `schemaTypes/index.ts` and in the page builder array in `documents/page.ts`.
- `mapPreview` description gains one sentence pointing to Map Explorer for the filterable map.
- `mapTeaser`'s initial button link `/map` becomes `#` (project rule: `#` for an unknown path).

## Frontend

- **Move** `app/map/{MapExplorer,MapboxMap,MultiSelectDropdown}.tsx`, `boundaries.ts`, `types.ts` to
  `components/map/`. Update imports (`MapPreview`, and anything importing `types`). Delete `app/map/`.
- **`components/blocks/MapExplorer.tsx`** (server component, the block): renders the client
  `MapExplorer` inside `<Suspense fallback={null}>` (required by `useSearchParams`).
- **Data comes from the block's GROQ projection** in `queries.ts` (`_type == "mapExplorer"`), the same
  way `mapPreview` does: `properties` via `mapPropertyFields`, `settings` via `mapSettingsFields`, and
  `filters` from the `propertyType` / `resource` query currently behind `mapFiltersQuery`. Share the
  field constants; do not duplicate them. `mapSettingsFields` drops `eyebrow`, `heading` and `intro`
  only if nothing else reads them (check `mapPreview` and the map code first).
  Standalone `propertiesQuery`, `mapFiltersQuery` and `mapSettingsQuery` are deleted if they end up
  with no callers.
- **Register** in `BlockRenderer` (`mapExplorer: MapExplorer`).
- **`MapExplorer` filters** use `usePathname()` rather than the literal `/map` in `router.replace`,
  so they work at whatever path the block sits. Filter params (`propertyType`, `resources`) are
  unchanged.
- **`app/page.tsx`**: no landing page: `notFound()`.
- Update the comment in `app/[...slug]/page.tsx` that cites `/map` as the example of a more specific
  route (`/news` or `/events` remain valid examples; check which exist).

## Content

- Seeded links: `seedBlockGallery.ts` `/map` hrefs become `#`.
- A small idempotent script, `studio/scripts/addMapExplorerToMapPage.ts` (`--dry` mode): finds the
  page at `explore/interactive-map` and, if it has no `mapExplorer` block, appends one. It states in
  its header that it only adds a block and never removes or reorders existing ones. If the page has
  no Hero Tertiary it reports that, but does not add one (the copy is the client's).
- The map page's heading and intro are authored in the page's Hero Tertiary. Existing
  `projectSettings` heading/intro values are left in place; whether to remove those fields is
  deferred and recorded as a GitHub issue.

## Docs

`DECISIONS.md`: update 1.7 (references to `app/map`), the routing note that cites `app/map` winning
over the catch-all (2.x, around line 316), and delete the "overlap; one should redirect" and
"`/` redirects to `/map`" outstanding items. Add an entry for this decision. `AGENTS.md`'s
"More specific routes (`app/map`) still win" is reworded to not name `app/map`, and the Properties
and the map section mentions `frontend/app/map/properties.ts` history only, so it is unchanged.

## Out of scope

- Removing `projectSettings.heading` / `intro` / `eyebrow` (issue).
- Adding a Hero Tertiary to the live page's content (client copy).

## Verification

1. `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit`
   in `studio`.
2. Run the add-block script with `--dry`, read the plan, then run it.
3. In the browser: the map page renders the block; toggling a filter updates the URL on that path,
   not `/map`; `/map` returns 404; `/` with no landing page returns 404.
4. Map rendering needs `NEXT_PUBLIC_MAPBOX_TOKEN`. Verify data (properties, filters, settings in the
   rendered props) separately from drawing, per the project rule.
5. Stop any dev server started.
