# Render all boundaries on the map, regardless of project assignment (temporary)

## Problem

The real client boundary file (`LandBankProperties.gpx`, converted to GeoJSON, see
[2026-07-31-gpx-boundary-upload-design.md](2026-07-31-gpx-boundary-upload-design.md)) has 517
features, none with usable names — every one now carries an auto-numbered fallback like
`track_42`. Matching each feature to the correct `project` document has to be done by hand: open a
project in Studio, use `BoundaryIdInput`, and visually compare the shape against the known
property. Right now the map (`/map`) only draws a boundary once some project's `boundaryId`
already points at it, so there is no way to see the other 516 shapes to figure out which one is
which.

## Decision

Render every feature in the boundary file on `/map`, not just ones a project currently points at,
as a temporary aid for that manual matching work. This is throwaway code, removed by hand once the
517 parcels are matched — no toggle, flag, or schema change.

- Assigned boundaries (a project's `boundaryId` resolves to a feature) keep their current
  behavior exactly as-is: blue fill/line, marker, hover-highlight linkage.
- Every other feature in the boundary file draws as a plain shape alongside them: amber
  (`#f59e0b`), dashed line, lower fill-opacity (0.15), no marker, no hover-highlight.
- Clicking any unassigned shape opens a popup showing `feature.properties.name` (e.g.
  `track_42`) — the exact value to type into that project's `boundaryId` field in Studio.

## Design

All changes are inside `frontend/app/map/MapboxMap.tsx`'s existing `renderMarkersAndGeojson()`
function, which already has access to the full `boundaries: BoundaryIndex` (a
`Map<string, GeoJSON.Feature>` built by `loadBoundaryIndex`, one entry per feature in the file) —
nothing new needs to be fetched.

- After the existing `property-geojson` source/layers (assigned projects, unchanged), add a
  second source `all-boundaries-geojson` built from `Array.from(boundaries.values())` — every
  feature in the file, whether or not any project points at it.
- Add it to the map **before** the existing `property-lines`/`property-polygons` layers so it sits
  visually beneath them — where an assigned parcel overlaps an unassigned one (shouldn't normally
  happen, but the file's real shape isn't fully known yet), the assigned blue fill wins.
- Two layers off that source:
  - `all-boundaries-lines`: `line` layer, filtered to `LineString` geometry, dashed
    (`line-dasharray: [2, 2]`), amber (`#f59e0b`).
  - `all-boundaries-polygons`: `fill` layer, filtered to `Polygon` geometry, amber
    (`#f59e0b`), `fill-opacity: 0.15`, no hover-state logic (unlike `property-polygons`, which
    varies opacity on hover — these never do, since there's no marker to link the hover to).
- A `click` listener on both new layers builds a `mapboxgl.Popup` at the click's `lngLat`,
  showing `feature.properties?.name` (escaped the same way `buildPopupHtml` already escapes
  project popup content, to stay consistent with the file's existing XSS-safety pattern for
  CMS/file-sourced strings).
- Old layers/sources are removed and the new ones re-added every time `renderMarkersAndGeojson`
  runs, following the exact same remove-then-re-add pattern already used for `property-geojson`
  in this function (so filter changes / boundary reloads don't leave stale layers behind).
- The click listener is added once per `renderMarkersAndGeojson` run and needs no separate cleanup
  beyond the layer/source removal already at the top of the function — Mapbox GL detaches
  layer-scoped listeners when the layer is removed.

## Testing/verification

No test framework exists in this repo. Verify by hand in a running Studio + frontend dev server:
confirm `/map` now shows ~517 amber shapes across the island (vastly more than the 8 blue assigned
ones), confirm clicking one shows its `track_N` popup, and confirm an assigned project's blue
shape/marker/hover behavior is completely unchanged. `npm run type-check` and `npm run lint` in
`frontend` (no schema change, so no typegen needed).

## Deferred / out of scope

- Removing this code once the 517 parcels are matched to projects — a manual follow-up, not part
  of this change.
- Any toggle/flag to turn this on and off without a code change.
