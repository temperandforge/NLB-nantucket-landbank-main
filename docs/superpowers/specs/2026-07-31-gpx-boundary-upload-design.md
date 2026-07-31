# GPX upload for boundary/trail data

## Problem

The client plans to upload a GPS/GPX file to author property boundaries and/or trail routes.
Today `projectSettings.boundaryData` and `projectSettings.trailsData` (`studio/src/schemaTypes/singletons/projectSettings.ts`)
only accept GeoJSON (`.geojson`, `.json`, `application/geo+json`, `application/json`). GPX is a
different format — it natively encodes tracks/routes (lines) and waypoints (points), not polygons —
so a GPX upload needs to be converted before the rest of the map pipeline (`frontend/app/map/boundaries.ts`,
`frontend/app/map/MapboxMap.tsx`) can use it unchanged.

## Decisions

- **Convert in Studio at upload time, not on the frontend.** A custom Studio input component
  parses the GPX client-side and uploads the converted GeoJSON as the stored asset. The frontend
  keeps consuming GeoJSON exactly as it does today — no new code path there.
- **Both `boundaryData` and `trailsData` accept GPX**, via one shared conversion utility, since
  either field may receive a GPX file from the client.
- **Track/route `<name>` becomes `properties.name`** on the corresponding GeoJSON feature. Editors
  set `boundaryIdProperty` to `"name"` for a GPX-sourced file — `BoundaryIdInput.tsx` needs no
  changes, it already reads whatever property `boundaryIdProperty` names.
- **A blank or duplicated name is replaced with an auto-numbered fallback.** Real-world GPX
  exports were found (via manual verification with the client's actual `LandBankProperties.gpx`)
  to sometimes carry a literal `<name> </name>` — a single space — on every track, with no other
  identifying tag anywhere in the file. Copying that straight into `properties.name` produces
  every feature with the same unusable, colliding value, which makes `boundaryIdProperty: "name"`
  unusable — `BoundaryIdInput`'s dedup logic collapses them all into one option. So after copying
  `<name>`, `gpxToGeoJson` post-processes the feature list: any feature whose `name` is
  empty/whitespace-only, or a duplicate of a name already seen earlier in the same file, gets
  replaced with `track_<n>` (`<n>` = 1-based position in the FeatureCollection). Non-blank,
  non-duplicated names are left untouched.
- **A closed track becomes a `Polygon`; an open one stays a `LineString`.** "Closed" means the
  first and last points of a track/route are within ~1–2 meters of each other (haversine
  distance). This lets one converter serve both boundary polygons and trail lines without
  per-field branching.
- **Waypoints (`<wpt>`) are dropped.** Neither `boundaryData` nor `trailsData` represents point
  features today; only track/route geometry is converted.
- **The stored asset is always GeoJSON.** The original `.gpx` file is discarded after conversion —
  it is never kept alongside the converted asset. This matches the existing contract that
  `boundaryData`/`trailsData` are GeoJSON FeatureCollections, full stop.

## Design

### Conversion utility — `studio/src/lib/gpxToGeoJson.ts`

- Input: a GPX file's text content.
- Parse with `DOMParser`, convert via `@tmcw/togeojson`'s `gpx(xml)`.
- Filter the resulting `FeatureCollection` to drop any `Point` features (waypoints).
- For each remaining `LineString` feature, compute the haversine distance between its first and
  last coordinate. If within tolerance (~1–2m), close the ring and rewrite the feature as a
  `Polygon` with a single linear ring; otherwise leave it as a `LineString`.
- `properties.name` comes from `togeojson`'s own handling of `<name>`, then gets the additional
  blank/duplicate post-processing described in the amendment below.
- Throws if the resulting `FeatureCollection` has zero features (no tracks/routes found), so the
  caller can surface an error and abort.

### Studio input — `studio/src/components/GpxAwareFileInput.tsx`

Wraps Sanity's default file input, used as the `components.input` for both
`projectSettings.boundaryData` and `projectSettings.trailsData`.

- Schema change: both fields' `options.accept` gains `.gpx,application/gpx+xml` alongside the
  existing GeoJSON accept values.
- On file selection:
  - If the extension is `.gpx`: read the file text, run it through `gpxToGeoJson`, upload the
    resulting GeoJSON via `client.assets.upload('file', blob, { filename: <original name with
    .gpx replaced by .geojson> })`, and patch the field to reference the new asset.
  - Otherwise (`.geojson`/`.json`): delegate to the default Sanity file input behavior, unchanged.
- On conversion failure (parse error, or zero features found): abort before any upload happens and
  show a Studio toast describing the problem. No partial or broken asset is ever written.

### Frontend

No changes. `boundaryDataUrl`/`trailsDataUrl` continue to resolve to a GeoJSON asset URL exactly as
today; `loadBoundaryIndex` and the Mapbox source/layer setup in `MapboxMap.tsx` are unaffected.

### New dependency

`@tmcw/togeojson` added to `studio`'s dependencies (browser-safe, works off a parsed
`DOMParser` document — no Node-only APIs).

## Verification

No test framework exists in this repo. Verify by:

- Uploading a real GPX file (client-provided, or a small hand-built one covering a closed track,
  an open track, and a waypoints-only file) into a local Studio instance and confirming the
  converted asset's shape.
- Confirming the converted boundary/trail renders correctly on `/map` in the browser.
- `npx tsc --noEmit` in `studio`.
- `npm run sanity:typegen`, `npm run type-check`, and `npm run lint` in `frontend` (schema's shape
  is unchanged, but run per project convention since `projectSettings.ts` changes).

## Deferred / out of scope

- Keeping the original GPX file alongside the converted GeoJSON (for provenance or re-conversion)
  — not needed now; can be added later as a second field if the client wants it.
- Waypoint support — no point-feature use case exists in the map today.
