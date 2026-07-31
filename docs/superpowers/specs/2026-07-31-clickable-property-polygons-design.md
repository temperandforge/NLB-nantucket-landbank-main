# Click-to-open popup on a property's boundary polygon

## Problem

`/map` currently only opens a project's popup (name, description, image, link) via its marker
pin. Since a project's boundary polygon is drawn directly from its `boundaryId`, a visitor should
also be able to click anywhere inside that shape to see the same information — not just the pin.

## Decision

Add a click handler on the existing `property-polygons` layer (`frontend/app/map/MapboxMap.tsx`)
that opens the identical popup content the marker already shows (`buildPopupHtml(project)`),
positioned at the click point. Markers, `location`/coordinates, and hover-highlight behavior are
all unchanged — this is additive only.

## Design

- `renderMarkersAndGeojson()` already computes a numeric `featureId` for each project that has a
  boundary, and pushes `{id: featureId, ...}` into the `property-geojson` source's features. Add
  a `Map<number, Project>` built in that same pass (call it `projectByFeatureId`), keyed by that
  same `featureId`, so a clicked Mapbox feature's `id` can be resolved back to its full `Project`
  object (the GeoJSON feature's own `properties` only carry `{id, name}` — not enough for
  `buildPopupHtml`, which needs `description`/`image`/`link` too).
- Store that map in a `useRef` (e.g. `projectByFeatureIdRef`), rebuilt at the start of every
  `renderMarkersAndGeojson()` run alongside the existing marker/feature rebuild, so the click
  handler (registered once, not per-render) always reads current data.
- The click handler itself is registered once, in the mount effect — the same lifecycle reason as
  the existing all-boundaries click handler: Mapbox GL layer-scoped listeners persist across
  `removeLayer`/`addLayer` cycles for the same layer id, so registering inside
  `renderMarkersAndGeojson` (which reruns on every filter/boundary change) would stack up
  duplicate handlers.
- Handler: read `e.features?.[0]?.id`, look up the project in `projectByFeatureIdRef.current`, and
  if found, `new mapboxgl.Popup({offset: 12}).setLngLat(e.lngLat).setHTML(buildPopupHtml(project)).addTo(map)`.
  No other behavior changes.

## Testing/verification

No test framework exists in this repo. `npm run type-check` and `npm run lint` in `frontend`, plus
manual verification: click inside an assigned project's blue polygon (away from its marker) and
confirm the same popup content the marker shows appears at the click point; confirm the marker,
hover-highlight, and `location` behavior are all unaffected.

## Deferred / out of scope

- Any change to `location`/coordinates or marker placement — kept exactly as today.
- Hover-based highlighting when hovering the polygon directly (only the marker triggers hover
  today) — not requested.
