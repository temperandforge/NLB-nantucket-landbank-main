# GPX / KML / KMZ upload for map data

Status: proposed. Nothing built.

## Goal

The client uploads the files their GIS tools produce — GPX for trails, KMZ/KML for property boundaries —
and Studio turns them into the GeoJSON the map already reads. The client never edits or converts
GeoJSON by hand. The original file is kept alongside the converted one.

Applies to both map files on Properties Settings (`projectSettings`): **boundaries** (`boundaryData`)
and **trails** (`trailsData`).

## What the sample files showed

A probe against the client's real files (throwaway, not committed) established:

| File | Converts to | Notes |
|---|---|---|
| `NLBTrailsGPX072026.gpx` (10 MB) | 242 LineStrings, ~100k points, ~4 MB | 1.4 s; every point is duplicated consecutively; `<ele>` is a blank string and produced no NaN |
| `Land_Bank_Propert_LayerToKML.kmz` | 276 features: 265 Polygon, 11 GeometryCollection (2–4 Polygons each) | KMZ is a zip holding `doc.kml` + an `.xsl`; coordinates are 3D (`z = 0`) |

Two facts shape the design:

1. **The Esri attribute table is an HTML string.** The KML converter yields only `name`, `description`
   (HTML) and style keys. `FID`, `Owner`, `Acres`, … exist only as `<tr><td>key</td><td>value</td></tr>`
   rows inside `description`. Without extracting them the configured ID property (`FID`) is absent.
2. **`name` cannot be the ID.** 150 distinct names across 276 features, 21 blank. `FID` is the stable key.

## Approach

Convert **in the browser, in Studio, at upload time**; store the result as an ordinary `.geojson` file
asset in the existing field. The frontend, GROQ and the map are unchanged. (Rejected: converting in the
frontend at render — ships an unzip library to visitors and fetches a 10 MB file per view; a server-side
function — more infrastructure than a 1.4 s browser conversion warrants.)

### Schema

Per map file, two fields instead of one:

- `boundarySource` / `trailsSource` (`file`) — **what the editor uploads.** Accepts `.gpx .kml .kmz
  .geojson .json`. This is the retained original.
- `boundaryData` / `trailsData` (`file`) — **generated**, read-only in Studio, the file the frontend
  reads. Same names and shape as today, so `boundaryData.asset->url` in `queries.ts` is untouched.

The upload field gets a custom input (`GeoFileInput`) that converts, uploads the GeoJSON asset, and
patches the source and generated fields together. If either asset upload fails, neither field changes.

Existing documents have `boundaryData` with no source. Studio shows it as "GeoJSON file (no original
kept)"; uploading through the new field replaces it.

Removing the source clears both fields as a pair.

### Conversion (`studio/src/lib/geoConversion.ts`)

A pure module: bytes + filename + options in; `{geojson, report}` out. The XML parser is injected
(`DOMParser` in the browser, `@xmldom/xmldom` in the verify script), so the same code runs in both.

Pipeline: detect format by extension (and sniff the zip magic bytes for `.kmz`) → for KMZ, unzip with
`fflate` and use `doc.kml`, else the first `.kml` → convert with `@tmcw/togeojson` → normalize.

Normalization, applied to every format including uploaded GeoJSON:

- Strip Z/M — coordinates become `[lng, lat]`.
- Round coordinates to 6 decimal places (~0.1 m) and drop consecutive duplicate points (the sample GPX
  doubles every point).
- Flatten `GeometryCollection` to the matching Multi* geometry (the map's polygon layer filters on
  `geometry-type`, which a collection does not satisfy).
- Keep only the geometry a layer draws: boundaries → Polygon/MultiPolygon, trails →
  LineString/MultiLineString. Anything else (waypoints, a polygon in a trails file) is dropped and counted.
- **KML only:** parse the `description` table into feature properties. Rows with two cells are key/value;
  empty values are omitted; values stay strings (`String()` is applied when indexing anyway). Style keys
  (`fill`, `stroke*`, `label-*`, `styleUrl`) and the HTML `description` are discarded.
- **GPX only:** keep `name` (omit when blank); discard `_gpxType`, `desc`, `coordinateProperties`.

### ID property

`boundaryIdProperty` defaults to **`FID`** (`initialValue` on the field). The `coalesce(..., "id")`
fallbacks that currently stand in for an unset value change to `"FID"` in `queries.ts`,
`MapboxMap.tsx` and `useBoundaryOptions.ts`. Production already has `FID` set, so behaviour there does
not change. The key stays configurable: the file is the client's, and a differently shaped export must
not need a deploy.

After converting a boundary file the input checks the configured property: features lacking it, and
duplicate values, are reported. When the property is missing from every feature, the report lists the
property names that *are* present so the editor can pick one.

### Report shown to the editor

Before anything is written, a summary: format detected, features kept, geometries merged, items dropped
(by type), ID property found / missing / duplicated, size before and after. Warnings do not block the
upload; a parse failure or zero usable features does, and leaves the existing files untouched. Replacing
the boundary file keeps the existing reminder that property assignments are not re-pointed.

## Frontend

No behaviour change beyond the `FID` fallback. The trails layer already draws every LineString in
`trailsData`; the boundary layer already indexes by `boundaryIdProperty`.

## Verification

- `studio/scripts/verifyGeoConversion.ts` (run with `npx sanity exec`), importing `geoConversion.ts`
  rather than restating its rules. Small committed fixtures cover: GPX track with duplicated points and
  blank `<ele>`; KMZ with a GeometryCollection, a blank name and an attribute table; a mixed-geometry
  file; a malformed zip. Optionally takes paths to the client's real files.
- Checks: output is `[lng, lat]` only; no `GeometryCollection`; ID property present; counts match the
  report; failures throw rather than return partial output.
- Studio in the browser: upload each format into each field, confirm the generated file and original
  both appear, the report reads correctly, and a failed upload changes nothing.
- Map in the browser against the converted files. Map *data* and *rendering* are verified separately
  (rendering needs `NEXT_PUBLIC_MAPBOX_TOKEN`).
- `sanity:typegen`, `type-check`, `lint` in `frontend`; `npx tsc --noEmit` in `studio`.

## Dependencies

Studio: `@tmcw/togeojson`, `fflate`. Dev only: `@xmldom/xmldom` (for the verify script).

## Open points to settle while building

- Writing the generated sibling field from a field input. Expected to work by patching the shared parent
  path from the input's `onChange`; if that does not hold, fall back to `useDocumentOperation`.
- Whether the read-only generated field should be hidden rather than shown. Leaning shown, so an editor
  can see what the map is actually reading.

## Deferred

Each is tracked in a GitHub issue:

- Reporting which identifiers a replacement file loses, so properties left pointing at them are
  surfaced at upload time rather than after: https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/64
- Populating empty `boundaryIds` on existing properties (150 properties, none populated; the KMZ has 150
  distinct names across 276 features, so name-matching is plausible but unconfirmed). Separate script with
  `--dry`: https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/65
- Waypoints (GPX) and point features (KML) are dropped, and elevation is discarded; no map layer draws
  them: https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/66
- Conversion hardening from review (`unzipKml` junk entries and size cap, uncounted drops): https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/67
- GeoFileInput polish from review: https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/68

### Not yet verified live

The live Studio upload, one-Apply-one-edit, the draft id path, real-browser parsing of the client's
KMZ/GPX, and map rendering have not been exercised (that writes to the production dataset). Checklist:
https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/69

## Decision record

On build, add `DECISIONS.md` §1.13: uploads are converted to GeoJSON in Studio; the original is retained;
the frontend only ever reads GeoJSON; `FID` is the default ID property.
