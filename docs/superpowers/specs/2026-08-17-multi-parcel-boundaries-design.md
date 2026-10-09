# Multi-Parcel Project Boundaries Design

**Date:** 2026-08-17

## Goal

A Land Bank property on the map often corresponds to several separate GIS parcels in the
uploaded boundary file (e.g. "Smooth Hummocks Coastal Preserve" is 28 distinct features sharing
one name). Today `project.boundaryId` holds exactly one feature identifier, so a project can only
ever draw one polygon. This work changes a project's boundary assignment to a set of identifiers,
updates the Studio picker and map rendering to match, and reseeds the `project` collection from
the real boundary file so every GIS-named property gets a project with its full set of parcels
assigned from the start.

## Scope

In scope:

- `project.boundaryId` (string) → `project.boundaryIds` (array of strings)
- `BoundaryIdInput` → `BoundaryIdsInput`: multi-select picker over the uploaded file's identifiers
- Frontend: `projectsQuery`, `MapSettings`/`Project` types, `MapboxMap.tsx`, `boundaries.ts`
  updated to resolve and render a project's full set of parcels, with combined hover highlighting
  and a combined-centroid marker fallback
- A one-off script that deletes all existing `project` documents and recreates one project per
  distinct `Name` in the boundary file, with `boundaryIds` set to every FID sharing that name
- `sanity:typegen` regeneration for both the schema and query type changes

Out of scope:

- Re-authoring descriptions, images, links, property types, or resources for the reseeded
  projects — intentionally left empty for the client to fill in afterward (confirmed with user;
  existing authored content on the 43 current projects is discarded)
- Changing `boundaryIdProperty` or the boundary file itself
- Any change to the trails layer

## Data Model

```
project.boundaryIds: array of string   // was: boundaryId: string
```

No other project fields change. `boundaryIds` is optional (a project can still have zero parcels
and rely on an explicit `location`, same as today).

## Studio: `BoundaryIdsInput`

Replaces `BoundaryIdInput`. The existing file-fetch-and-build-options logic (fetch
`projectSettings.boundaryData`, index by `boundaryIdProperty`, build `{value, label}` options) is
extracted into a shared hook (`useBoundaryOptions`) so it isn't duplicated between the old and new
component; the old component is deleted rather than kept alongside.

UI: an `Autocomplete` for adding a parcel (same search behavior as today), plus the currently
assigned parcels rendered as a removable chip list below it. Each chip shows the same
`"{name} — {id}"` label as the dropdown. A chip whose id is no longer present in the uploaded file
is flagged individually (tone="critical", "not in the uploaded file") rather than as one blanket
warning for the whole field, so a client fixing a stale assignment on a multi-parcel project can
see exactly which parcel needs replacing.

Selecting an id already in the list is a no-op (Autocomplete strips it from its own options once
selected, matching typical multi-select behavior).

## Frontend

**Query / types:** `projectsQuery` selects `boundaryIds` instead of `boundaryId`. The generated
`Project` type follows automatically from `sanity:typegen`.

**`boundaries.ts`:** `loadBoundaryIndex` is unchanged — it still indexes individual features by
id, because parcels remain independent GeoJSON features. `geometryCenter` gains a
`geometryCenterOfMany(geometries: GeoJSON.Geometry[])` alongside the existing single-geometry
function, averaging vertices across all of them, for the marker-fallback case.

**`MapboxMap.tsx`:** for each project:

1. Resolve every id in `boundaryIds` against the boundary index, dropping any that aren't found
   (same silent-skip behavior as an unmatched single id today — a project with a stale id just
   doesn't draw that parcel, it doesn't error).
2. Push one GeoJSON feature per resolved parcel, each with its own sequential numeric feature id
   (as today), and collect the full list of feature ids for that project.
3. Marker position: explicit `project.location` wins; otherwise
   `geometryCenterOfMany` across all resolved parcel geometries; otherwise no marker.
4. `markerEntries` changes from `{featureId: number; marker}` to `{featureIds: number[]; marker}`.
   Hover mouseenter sets `feature-state` `{hover: true}` on every id in `featureIds`; mouseleave
   clears every previously-hovered id (the single `hoveredStateId` becomes `hoveredStateIds:
   number[]`).

No changes to layer definitions, paint, or the trails layer.

## Reseed Script

`studio/scripts/reseedProjectsFromBoundaries.ts`:

1. Fetch `projectSettings.boundaryData` and `boundaryIdProperty` (must be `"FID"` for this
   client's current file; the script asserts this and exits with a clear error otherwise, same
   guard pattern as the matching script used earlier in this work).
2. Group features by `properties.Name` (features with no `Name` are skipped and reported, not
   silently dropped).
3. For each group: `name` = the shared Name, `slug` = kebab-cased Name with non-alphanumerics
   collapsed to hyphens (e.g. `"Backus/Dias"` → `backus-dias`, `"'Sconset Golf Course"` →
   sconset-golf-course`), de-duplicated with a numeric suffix if two distinct Names collide after
   slugifying. `boundaryIds` = every FID in the group, as strings.
4. `--dry` prints the full plan (name, slug, parcel count, combined acreage) and exits without
   writing.
5. Real run: deletes every existing `project` document (both draft and published ids) inside one
   transaction, then creates the new set. Logs a before/after count.

This is a one-off destructive reset, not an idempotent upsert like the other content scripts in
this repo — re-running it is safe (delete-then-recreate again) but it is not merge-safe, and its
header says so.

## Error Handling

- A `boundaryIds` entry not present in the uploaded file: dropped silently at render time (matches
  existing single-id behavior), flagged individually in the Studio picker.
- A feature with no `Name` property in the reseed script: skipped, name logged to the console
  summary so the client can decide whether to add it by hand afterward.
- Boundary file missing or empty at reseed time: script throws before deleting anything.

## Testing / Verification

No test framework exists in this repo. Verification steps:

- `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit`
  in `studio`.
- `--dry` run of the reseed script reviewed before the real run.
- After the real run, a read-only script re-fetches `projectsQuery`-equivalent data and confirms
  every project's `boundaryIds` resolve to real features in the boundary file (same technique used
  earlier in this conversation to verify the 9 auto-matched projects).
- Visual check in the browser wherever Mapbox is reachable (not this sandbox — see prior note on
  `api.mapbox.com` being unreachable here) — hovering a multi-parcel project's marker should
  highlight all of its polygons.
