# GPX / KML / KMZ upload for map data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editors upload GPX/KML/KMZ/GeoJSON on Properties Settings; Studio converts it to normalised GeoJSON, stores both the original and the GeoJSON, and the map keeps reading the GeoJSON unchanged.

**Architecture:** A pure conversion module (`studio/src/lib/geoConversion.ts`, XML parser injected) does all format work. A Studio file input built from it converts in the browser, uploads two assets and patches a source/generated field pair. Schema gains `boundarySource`/`trailsSource`; `boundaryData`/`trailsData` become generated and read-only. `FID` becomes the default ID property.

**Tech Stack:** Sanity Studio v5 (React 19), `@tmcw/togeojson`, `fflate`, dev-only `@xmldom/xmldom`, `sanity exec` for the verify script.

**Spec:** [docs/superpowers/specs/2026-10-20-geo-file-upload-design.md](../specs/2026-10-20-geo-file-upload-design.md)

## Global Constraints

- Convert in the browser in Studio at upload time; the frontend only ever reads GeoJSON.
- Output coordinates are `[lng, lat]` only, rounded to 6 decimal places; consecutive duplicate points removed.
- No `GeometryCollection` in output: flatten to the matching Multi* geometry.
- Boundaries keep Polygon/MultiPolygon only; trails keep LineString/MultiLineString only. Everything else is dropped and counted.
- KML: parse the `description` table into string properties (two-cell `tr` = key/value, empty values omitted); discard `fill`, `stroke*`, `label-*`, `styleUrl` and the HTML `description`.
- GPX: keep `name` (omit when blank); discard `_gpxType`, `desc`, `coordinateProperties`.
- Default `boundaryIdProperty` is `FID`: `initialValue` and the `coalesce(..., "id")` fallbacks in `queries.ts`, `MapboxMap.tsx`, `useBoundaryOptions.ts`, `BoundaryIdInput.tsx` all become `FID`.
- A parse failure or zero usable features writes nothing and leaves existing files untouched. If either asset upload fails, neither field changes.
- Existing field names `boundaryData` / `trailsData` and `boundaryData.asset->url` in `queries.ts` stay as they are.
- The conversion module takes the XML parser as an argument (`DOMParser` in browser, `@xmldom/xmldom` in scripts). Do not touch the global.
- Per AGENTS.md: run `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`, `npx tsc --noEmit` in `studio`. Stop any dev server you start. Verify visual work in the browser.

## Review Focus

Failure modes the spec implies but does not spell out, most likely first. Each has a test in the task that owns the code.

1. **`FID` of `0` is falsy.** The first feature in the client's file has `FID` `0`; a truthiness check reports it missing. (Task 3)
2. **Upper-case extensions** (`.KMZ`, `.GPX`) from Windows/GIS exports must be detected. (Task 1)
3. **Zero usable features** — a trails upload containing only waypoints, or a boundary upload of only points — must fail with a message, not write an empty file. (Task 1)
4. **KMZ with no `.kml` inside** (or the `.kml` in a subfolder) must fail clearly, or use the first `.kml` found. (Task 2)
5. **A GeometryCollection mixing a Polygon with a Point** keeps the polygon, drops the point and counts it. (Task 2)

---

## File Structure

| File | Responsibility |
|---|---|
| `studio/src/lib/geoConversion.ts` | `convertGeoFile` and its types; public entry |
| `studio/src/lib/geoNormalize.ts` | Layer-aware geometry normalisation (Z strip, rounding, dedupe, flatten, filter) |
| `studio/src/lib/geoSources.ts` | Format detection, GPX/KML/KMZ/GeoJSON → raw FeatureCollection, KML attribute-table parsing |
| `studio/src/lib/geoReport.ts` | `ConversionReport` type, ID-property check |
| `studio/src/components/GeoFileInput.tsx` | `geoFileInput(layer)` factory returning the Studio input |
| `studio/scripts/verifyGeoConversion.ts` | Verify script; builds fixtures, imports the lib |
| `studio/scripts/fixtures/geo/*` | Small text fixtures (GPX, KML). KMZ is built in the script with `zipSync` |
| `studio/src/schemaTypes/singletons/projectSettings.ts` | New source fields, read-only generated fields, `FID` default |
| `docs/DECISIONS.md` | §1.13 |

---

### Task 1: Normalisation, GPX, and the public entry point

**Files:**
- Create: `studio/src/lib/geoConversion.ts`, `geoNormalize.ts`, `geoSources.ts`, `geoReport.ts`
- Create: `studio/scripts/verifyGeoConversion.ts`, `studio/scripts/fixtures/geo/trails.gpx`
- Modify: `studio/package.json`

**Interfaces:**
- Produces (`geoReport.ts`):
  ```ts
  export type GeoLayer = 'boundaries' | 'trails'
  export type GeoFormat = 'gpx' | 'kml' | 'kmz' | 'geojson'
  export type ConversionReport = {
    format: GeoFormat
    featuresKept: number
    geometriesMerged: number
    dropped: Record<string, number> // geometry type -> count
    idProperty: IdPropertyReport | null // null for trails
    bytesIn: number
    bytesOut: number
  }
  export type IdPropertyReport = {
    name: string
    status: 'found' | 'missing' | 'duplicated'
    missingCount: number
    duplicateValues: string[]
    available: string[]
  }
  ```
- Produces (`geoConversion.ts`):
  ```ts
  export type ParseXml = (xml: string, mime: 'text/xml' | 'text/html') => Document
  export type ConvertInput = {
    bytes: Uint8Array
    filename: string
    layer: GeoLayer
    idProperty?: string
    parseXml: ParseXml
  }
  export type ConversionResult = {geojson: GeoJSON.FeatureCollection; report: ConversionReport}
  export class GeoConversionError extends Error {}
  export function convertGeoFile(input: ConvertInput): ConversionResult
  ```
- Produces (`geoSources.ts`): `detectFormat(filename: string, bytes: Uint8Array): GeoFormat` (case-insensitive extension; zip magic `PK\x03\x04` makes a `.kml`-named upload a KMZ); `readSource(format, bytes, parseXml): GeoJSON.FeatureCollection` (raw, un-normalised).
- Produces (`geoNormalize.ts`): `normalizeCollection(raw: GeoJSON.FeatureCollection, layer: GeoLayer): {features: GeoJSON.Feature[]; merged: number; dropped: Record<string, number>}`.

- [ ] **Step 1: Add dependencies.** In `studio`: `npm i @tmcw/togeojson fflate` and `npm i -D @xmldom/xmldom @types/geojson`.
- [ ] **Step 2: Write fixture `studio/scripts/fixtures/geo/trails.gpx`:** one `<trk>` with one `<trkseg>` of 4 `<trkpt>`s where points 1–2 are identical and each has `<ele> </ele>`, a `<name>Test Trail</name>`; a second `<trk>` with blank `<name> </name>`; one `<wpt>`.
- [ ] **Step 3: Write failing checks in `verifyGeoConversion.ts`.** Structure it as a list of named `check(name, fn)` calls that throw on failure; print each name; exit non-zero on the first failure (same style as `verifyPageRouting.ts`). Parser: `new DOMParser().parseFromString(xml, mime)` from `@xmldom/xmldom`. Checks for this task:
  - `gpx trails: dedupes consecutive points` — first feature has 3 coordinates, each `[number, number]` (length 2).
  - `gpx trails: keeps name, omits blank name` — features[0].properties `{name:'Test Trail'}`; features[1].properties has no `name` key; no `_gpxType`/`coordinateProperties`/`desc`.
  - `gpx trails: waypoint dropped and counted` — `report.dropped.Point === 1`.
  - `coordinates rounded to 6 dp` — a coordinate `-70.10563114114368` becomes `-70.105631`.
  - `uppercase extension detected` — `detectFormat('TRAILS.GPX', bytes) === 'gpx'` and `detectFormat('A.KMZ', bytes) === 'kmz'`.
  - `zero usable features throws` — a GPX containing only a `<wpt>` converted for `trails` throws `GeoConversionError` with a message containing "no usable".
  - `report sizes` — `bytesIn === bytes.length`, `bytesOut === JSON.stringify(geojson).length`.
- [ ] **Step 4: Run to verify it fails.** `cd studio && npx sanity exec scripts/verifyGeoConversion.ts` — Expected: FAIL, module not found.
- [ ] **Step 5: Implement** the four lib files to the interfaces above. `readSource` for `gpx` uses `gpx()` from `@tmcw/togeojson` on `parseXml(text, 'text/xml')`; for `geojson` it `JSON.parse`s and accepts a FeatureCollection, a single Feature or a bare geometry (wrapping the last two). `normalizeCollection` order: flatten GeometryCollection → filter by layer (count drops by geometry type) → strip to 2D → round → dedupe consecutive points → for each feature keep only the properties produced by the source step. `convertGeoFile` throws `GeoConversionError('… no usable <geometry kind> …')` when `features` is empty; a `JSON.parse`/XML failure is rethrown as `GeoConversionError`.
- [ ] **Step 6: Run the verify script.** Expected: all checks PASS.
- [ ] **Step 7: `cd studio && npx tsc --noEmit`** — Expected: no errors.
- [ ] **Step 8: Commit** — `git add studio/package.json studio/package-lock.json studio/src/lib studio/scripts && git commit -m "feat(studio): convert GPX and normalise GeoJSON for map uploads"`

### Task 2: KML and KMZ, with the attribute table

**Files:**
- Modify: `studio/src/lib/geoSources.ts`
- Create: `studio/scripts/fixtures/geo/boundaries.kml`
- Modify: `studio/scripts/verifyGeoConversion.ts`

**Interfaces:**
- Consumes: Task 1 `readSource`, `normalizeCollection`, `convertGeoFile`.
- Produces (`geoSources.ts`): `parseAttributeTable(html: string, parseXml: ParseXml): Record<string, string>`.

- [ ] **Step 1: Write fixture `boundaries.kml`** (hand-written, small) with these Placemarks, each with the style keys the converter emits and a `description` CDATA holding an Esri-style nested HTML table (rows of two `<td>`s: `FID`, `Owner`, `Name`, `Acres`, an empty `Seller_Nam`):
  - A: Polygon, `FID` `0`, name "Alpha".
  - B: `MultiGeometry` of two Polygons, `FID` `1`, name "Beta".
  - C: `MultiGeometry` of one Polygon + one Point, `FID` `2`, name blank.
  - D: Polygon with an inner ring (hole), `FID` `3`, same name "Alpha" as A.
  - E: a Point only, `FID` `4`.
  - Coordinates carry a third value `0`.
- [ ] **Step 2: Write failing checks.**
  - `kml: attribute table becomes properties` — A's properties include `FID: '0'`, `Owner`, `Acres`; no `Seller_Nam`; no `description`, `styleUrl`, `fill`, `stroke`, `stroke-width`, `fill-opacity`, `label-color`.
  - `kml: GeometryCollection flattened` — B is a `MultiPolygon` with 2 polygons; `report.geometriesMerged >= 1`.
  - `kml: mixed collection keeps polygon, drops point` (Review Focus 5) — C becomes a `Polygon`; `report.dropped.Point` counts the point inside C **and** feature E (so ≥ 2).
  - `kml: z stripped` — every position has length 2.
  - `kml: polygon holes preserved` — D has 2 rings.
  - `kml: names are not the id` — A and D share a name yet both survive.
  - `kmz: unzips doc.kml` — build the zip in the script: `zipSync({'doc.kml': strToU8(kml), 'x.xsl': strToU8('<x/>')})`; converting it yields the same features as the raw KML.
  - `kmz: kml in a subfolder is found` — `zipSync({'files/doc.kml': …})` converts.
  - `kmz: no kml inside throws` (Review Focus 4) — zip of only `x.xsl` throws `GeoConversionError` with message containing ".kml".
  - `kmz: not a zip throws` — random bytes named `a.kmz` throw `GeoConversionError`.
  - `kml named .kml but zipped is treated as kmz` — via the magic-byte sniff.
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement** KML/KMZ branches in `readSource`: KMZ via `unzipSync` (`fflate`), pick the first entry whose lowercase name ends `.kml` (prefer `doc.kml`); convert with `kml()` from `@tmcw/togeojson`; then for each feature call `parseAttributeTable(String(description.value ?? description), parseXml)` and replace `properties` with the result plus `name` when non-blank. `parseAttributeTable` parses with `parseXml(html, 'text/html')`, iterates every `tr`, and for rows whose own direct cells number exactly two takes trimmed text of each; skips empty keys and values. Pick the **innermost** rows so nested tables do not produce a merged row.
- [ ] **Step 5: Run the verify script.** Expected: all checks PASS (Task 1 checks still pass).
- [ ] **Step 6: Against the client's real KMZ** (outside the repo; do not commit it): add an optional CLI path argument to the verify script, run `npx sanity exec scripts/verifyGeoConversion.ts -- "<path to Land_Bank_Propert_LayerToKML.kmz>"`, and confirm 276 features before normalisation, no `GeometryCollection`, and `FID` present on all. Expected: report prints and exits 0.
- [ ] **Step 7: Commit** — `git commit -am "feat(studio): convert KML and KMZ with Esri attribute tables"` (adding the fixture and script too).

### Task 3: ID-property check and report

**Files:**
- Modify: `studio/src/lib/geoReport.ts`, `geoConversion.ts`, `studio/scripts/verifyGeoConversion.ts`

**Interfaces:**
- Consumes: Task 1 `ConversionReport`, `IdPropertyReport`.
- Produces (`geoReport.ts`): `checkIdProperty(features: GeoJSON.Feature[], idProperty: string): IdPropertyReport`.

- [ ] **Step 1: Write failing checks.**
  - `id: FID 0 counts as present` (Review Focus 1) — feature with `FID: '0'` (string) and a feature with `FID: 0` (number) are both found; `missingCount === 0`.
  - `id: reports missing` — features without `FID` give `status: 'missing'`, `missingCount` equal to that number, and `available` lists the property names that do exist (sorted, unique).
  - `id: reports duplicates` — two features sharing `FID` `7` give `status: 'duplicated'`, `duplicateValues: ['7']`.
  - `id: blank string counts as missing`.
  - `id: not computed for trails` — `convertGeoFile({layer:'trails'}).report.idProperty === null`.
  - `id: defaults to FID` — `convertGeoFile` with no `idProperty` on the fixture KML yields `report.idProperty.name === 'FID'`, `status 'found'`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** `checkIdProperty` using `String(value)` and explicit `undefined`/`null`/`''` checks (never truthiness); wire it into `convertGeoFile` for `boundaries` with `input.idProperty ?? 'FID'`.
- [ ] **Step 4: Run the verify script.** Expected: all PASS. Also re-run against the real KMZ; expected `status: 'found'`, `missingCount: 0`, and no `duplicated`.
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): report the boundary ID property on conversion"`

### Task 4: Schema — source fields, generated fields, `FID` default

**Files:**
- Modify: `studio/src/schemaTypes/singletons/projectSettings.ts`, `studio/src/components/useBoundaryOptions.ts`, `studio/src/components/BoundaryIdInput.tsx`, `frontend/sanity/lib/queries.ts:191`, `frontend/components/map/MapboxMap.tsx:106`
- Regenerate: `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Produces: schema fields `boundarySource`, `trailsSource` (`file`, group `map`, `accept: '.gpx,.kml,.kmz,.geojson,.json,.xml,.zip'` plus matching mime types); `boundaryData` and `trailsData` gain `readOnly: true` and rewritten descriptions. Each field's `components.input` is assigned in Task 5.

- [ ] **Step 1: Edit `projectSettings.ts`:** add `boundarySource` before `boundaryData` and `trailsSource` before `trailsData`; mark both data fields `readOnly: true` and reword their descriptions to say they are generated from the source file; reword the source descriptions (what to upload, that the original is kept, and — for boundaries — that replacing the file does not re-point any property). Change `boundaryIdProperty` `initialValue` to `'FID'` and its description example list to lead with "FID".
- [ ] **Step 2: Change the four `"id"` fallbacks to `FID`** — `queries.ts:191` (`coalesce(boundaryIdProperty, "FID")`), `MapboxMap.tsx:106`, `useBoundaryOptions.ts:11`, `BoundaryIdInput.tsx:22`.
- [ ] **Step 3: Regenerate types.** `cd frontend && npm run sanity:typegen`.
- [ ] **Step 4: Verify.** `cd frontend && npm run type-check && npm run lint`; `cd studio && npx tsc --noEmit`. Expected: no errors. `git diff --stat` shows the generated files changed.
- [ ] **Step 5: Commit** — `git add -A studio frontend sanity.schema.json && git commit -m "feat(studio): source/generated field pair for map files, FID default"` (check `git status` first so unrelated working-tree changes are not swept in).

### Task 5: `GeoFileInput`

**Files:**
- Create: `studio/src/components/GeoFileInput.tsx`
- Modify: `studio/src/schemaTypes/singletons/projectSettings.ts` (assign the input)

**Interfaces:**
- Consumes: Task 1–3 `convertGeoFile`, `GeoConversionError`, `ConversionReport`, `GeoLayer`.
- Produces: `export function geoFileInput(layer: GeoLayer): (props: FileInputProps) => JSX.Element`. `boundarySource` uses `geoFileInput('boundaries')` and `trailsSource` uses `geoFileInput('trails')`, via `components: {input: …}`. The generated field is derived from the layer: `boundaries → boundaryData`, `trails → trailsData`.

- [ ] **Step 1: Implement the input** with these behaviours (the decisions; the React is yours):
  - A file chooser accepting the schema's types. On choose: read `arrayBuffer()`, show a spinner, call `convertGeoFile` with `parseXml: (xml, mime) => new DOMParser().parseFromString(xml, mime)` and, for boundaries, the document's `boundaryIdProperty` (read via `useFormValue(['boundaryIdProperty'])`).
  - **Report before writing.** Show format, features kept, geometries merged, dropped counts by type, ID-property status (with `available` names when missing, and duplicate values when duplicated), and bytes before/after. The editor confirms with an "Apply" button; "Cancel" discards. On `GeoConversionError` show the message and write nothing.
  - **Apply:** upload the original with `client.assets.upload('file', file, {filename})` and the GeoJSON with `client.assets.upload('file', new Blob([JSON.stringify(geojson)], {type: 'application/geo+json'}), {filename: <original-basename>.geojson})`; **only after both succeed** patch the source field and the generated field together. If either upload throws, show the error and change neither.
  - **Remove:** clears both fields.
  - Show the generated file beneath the input (filename, size, link) so the editor sees what the map reads. Where a generated file exists with no source, label it "GeoJSON file (no original kept)".
  - Keep the standard "boundary assignments are not re-pointed" reminder visible for boundaries.
- [ ] **Step 2: Resolve the open point from the spec — writing the sibling field.** First try patching both through the field's `onChange` plus the parent path; if the sibling cannot be reached that way, use `useDocumentOperation('projectSettings', 'projectSettings').patch.execute([{set: {…}}])` for **both** fields so they land in one draft patch. Confirm in Studio (Step 4) that one apply produces one edit, not two.
- [ ] **Step 3: Assign the input** in `projectSettings.ts` for the two source fields; `cd studio && npx tsc --noEmit` — Expected: no errors.
- [ ] **Step 4: Verify in Studio.** Start `npx sanity dev` (check port 3333 first; stop only the process you started). With the client's real files: upload the KMZ into boundaries → report reads 276 features / GeometryCollections merged / `FID` found; apply; both the original and the generated GeoJSON appear. Upload the GPX into trails → 242 features. Force a failure (upload a text file named `x.kmz`) → error shown, fields unchanged. Upload an `.geojson` → converts and applies. Remove → both fields cleared.
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): upload GPX/KML/KMZ on Properties Settings"` (add the new file).

### Task 6: End-to-end on the map, decision record, deferred issues

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/superpowers/specs/2026-10-20-geo-file-upload-design.md`

- [ ] **Step 1: Map data check.** Using the generated files now stored on `projectSettings`, confirm in the browser that `boundaryData.asset->url` returns GeoJSON with `FID` on every feature and no `GeometryCollection`, and `trailsData` returns only LineStrings. Verify *data* here; rendering is a separate check.
- [ ] **Step 2: Map rendering check.** With `NEXT_PUBLIC_MAPBOX_TOKEN` set, start `frontend` dev (check port 3000 first — it may already belong to the user; do not kill theirs) and load `/explore/map`: trails draw. Boundaries draw only for properties that have `boundaryIds` (currently none — see the deferred item below), so confirm instead that the console shows no errors and the trails layer is present. Stop any server you started.
- [ ] **Step 3: Add `docs/DECISIONS.md` §1.13** after §1.12 (renumber nothing): uploads convert to GeoJSON in Studio, original retained in `*Source`, frontend reads only `*Data`, `FID` default, and why conversion is in the browser. Include implementation status.
- [ ] **Step 4: File the deferred issues.** For each, first `gh issue list --search "<terms>" --state all`; then `gh issue create` with what is missing, why deferred, and enough context to act on:
  - report which identifiers a replacement file loses;
  - populate empty `boundaryIds` on existing properties (150 distinct KMZ names vs 150 properties; script with `--dry`);
  - waypoints / point features dropped; elevation discarded.
  Link each from the spec's Deferred section, replacing the plain bullets.
- [ ] **Step 5: Final verification.** `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`; `cd studio && npx tsc --noEmit && npx sanity exec scripts/verifyGeoConversion.ts`. Expected: all pass; no new dev servers left running.
- [ ] **Step 6: Commit** — `git commit -am "docs: record geo-file upload decision and deferred work"`; mention the issue numbers in the summary.
