# GPX Upload for Boundary/Trail Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the client upload a GPX file into `projectSettings.boundaryData` or `projectSettings.trailsData`, converting it client-side in Studio into the GeoJSON FeatureCollection those fields already store, so nothing downstream (frontend map code, `BoundaryIdInput`) needs to change.

**Architecture:** A pure conversion function (`gpxToGeoJson`) parses GPX text into a GeoJSON `FeatureCollection` using `@tmcw/togeojson`, drops waypoints, and promotes any closed track/route to a `Polygon`. A custom Studio file-input component (`GpxAwareFileInput`) wraps both `boundaryData` and `trailsData`: for a `.gpx` selection it converts then uploads the result as the asset; for anything else it uploads the file as-is. The stored asset is always GeoJSON — the original GPX is never kept.

**Tech Stack:** Sanity Studio (React 19, `sanity` v5, `@sanity/ui`), TypeScript, `@tmcw/togeojson` for GPX parsing. This is a monorepo (`npm workspaces`: `studio`, `frontend`) — dependencies install at the repo root.

## Global Constraints

- Convert in Studio at upload time — the frontend (`frontend/app/map/*`) must not change.
- Both `boundaryData` and `trailsData` accept GPX, via one shared conversion utility.
- A track/route `<name>` becomes `properties.name` on its GeoJSON feature.
- A track/route is promoted to `Polygon` when its first and last points are within ~1–2 meters
  (haversine distance); otherwise it stays a `LineString`. Multi-segment tracks
  (`MultiLineString`) are left untouched — closing only applies to a single continuous line.
- Waypoints (`<wpt>` → `Point` features) are dropped entirely.
- The stored asset is always GeoJSON; the original `.gpx` is discarded after conversion.
- No test framework exists in this repo (see `AGENTS.md`) — verify with ad-hoc `npx tsx` scripts
  plus `npx tsc --noEmit`, not a test runner.
- After any schema change, run `npm run sanity:typegen`, `npm run type-check`, and `npm run lint`
  in `frontend`, and `npx tsc --noEmit` in `studio` (per `AGENTS.md` Verification section).

---

### Task 1: Add the GPX parsing dependency

**Files:**
- Modify: `studio/package.json`
- Modify: `package-lock.json` (repo root — via `npm install`)

**Interfaces:**
- Produces: `@tmcw/togeojson`'s `gpx(doc: Document): GeoJSON.FeatureCollection` export, and
  ambient `GeoJSON` namespace types (via `@types/geojson`), for Task 2 to import.

- [ ] **Step 1: Install the runtime dependency into the `studio` workspace**

Run from the repo root:
```bash
npm install @tmcw/togeojson --workspace=studio
```

- [ ] **Step 2: Install the type declarations as a dev dependency**

```bash
npm install -D @types/geojson --workspace=studio
```

- [ ] **Step 3: Verify the install**

Run:
```bash
grep -n "@tmcw/togeojson\|@types/geojson" studio/package.json
```
Expected: both lines present — `@tmcw/togeojson` under `dependencies`, `@types/geojson` under
`devDependencies`.

Then run:
```bash
cd studio && npx tsc --noEmit
```
Expected: passes with no new errors (this is a baseline check before any code changes).

- [ ] **Step 4: Commit**

```bash
git add studio/package.json package-lock.json
git commit -m "chore(studio): add @tmcw/togeojson for GPX conversion"
```

---

### Task 2: Write the `gpxToGeoJson` conversion utility

**Files:**
- Create: `studio/src/lib/gpxToGeoJson.ts`
- Create (temporary, not committed): `/tmp` or scratch script for manual verification — see Step
  2 below; delete it before committing.

**Interfaces:**
- Consumes: `@tmcw/togeojson`'s `gpx(doc: Document): GeoJSON.FeatureCollection` (Task 1).
- Produces: `gpxToGeoJson(gpxText: string): GeoJSON.FeatureCollection` — throws `Error` with a
  human-readable message if the XML doesn't parse, or if zero track/route features remain after
  filtering. Task 3 (the input component) calls this directly and catches thrown errors to show a
  toast.

- [ ] **Step 1: Write the utility**

```typescript
// studio/src/lib/gpxToGeoJson.ts
import {gpx} from '@tmcw/togeojson'

/**
 * Converts GPX text (tracks and routes only — waypoints are dropped) into a GeoJSON
 * FeatureCollection. A track/route whose first and last points are within
 * CLOSE_TOLERANCE_METERS of each other becomes a Polygon; otherwise it stays a LineString.
 * Multi-segment tracks (MultiLineString) are left as-is — closing only applies to a single
 * continuous line, since a MultiLineString may cover disjoint segments that don't form one ring.
 */
export function gpxToGeoJson(gpxText: string): GeoJSON.FeatureCollection {
  const xml = new DOMParser().parseFromString(gpxText, 'text/xml')
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not parse this file as GPX.')
  }

  const converted = gpx(xml) as GeoJSON.FeatureCollection
  const features = converted.features
    .filter((feature) => feature.geometry.type !== 'Point')
    .map(closeIfLoop)

  if (features.length === 0) {
    throw new Error('No tracks or routes found in this GPX file.')
  }

  return {type: 'FeatureCollection', features}
}

const CLOSE_TOLERANCE_METERS = 2

function closeIfLoop(feature: GeoJSON.Feature): GeoJSON.Feature {
  if (feature.geometry.type !== 'LineString') return feature

  const coords = feature.geometry.coordinates
  if (coords.length < 3) return feature

  const first = coords[0]
  const last = coords[coords.length - 1]
  const distance = haversineDistanceMeters(first, last)
  if (distance > CLOSE_TOLERANCE_METERS) return feature

  const ring = distance === 0 ? coords : [...coords, first]
  return {...feature, geometry: {type: 'Polygon', coordinates: [ring]}}
}

function haversineDistanceMeters(a: GeoJSON.Position, b: GeoJSON.Position): number {
  const earthRadiusMeters = 6371000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)
  const sinDeltaLat = Math.sin(deltaLat / 2)
  const sinDeltaLon = Math.sin(deltaLon / 2)

  const h =
    sinDeltaLat * sinDeltaLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinDeltaLon * sinDeltaLon

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h))
}
```

- [ ] **Step 2: Verify behavior with an ad-hoc script (no test framework in this repo)**

Create a scratch file `studio/scratch-verify-gpx.ts` (do not commit — delete it in Step 4):

```typescript
import assert from 'node:assert'
import {gpxToGeoJson} from './src/lib/gpxToGeoJson'

// A closed track (first point repeated at the end) should become a Polygon.
const closedTrackGpx = `<?xml version="1.0"?>
<gpx version="1.1"><trk><name>Parcel 12</name><trkseg>
<trkpt lat="41.2835" lon="-70.0995"></trkpt>
<trkpt lat="41.2840" lon="-70.0990"></trkpt>
<trkpt lat="41.2838" lon="-70.1000"></trkpt>
<trkpt lat="41.2835" lon="-70.0995"></trkpt>
</trkseg></trk></gpx>`

const closedResult = gpxToGeoJson(closedTrackGpx)
assert.strictEqual(closedResult.features.length, 1)
assert.strictEqual(closedResult.features[0].geometry.type, 'Polygon')
assert.strictEqual(closedResult.features[0].properties?.name, 'Parcel 12')
console.log('PASS: closed track -> Polygon with name property')

// An open track should stay a LineString.
const openTrackGpx = `<?xml version="1.0"?>
<gpx version="1.1"><trk><name>Head of the Plains Trail</name><trkseg>
<trkpt lat="41.2900" lon="-70.0900"></trkpt>
<trkpt lat="41.2950" lon="-70.0850"></trkpt>
</trkseg></trk></gpx>`

const openResult = gpxToGeoJson(openTrackGpx)
assert.strictEqual(openResult.features[0].geometry.type, 'LineString')
console.log('PASS: open track -> LineString')

// Waypoints-only file should throw.
const waypointsOnlyGpx = `<?xml version="1.0"?>
<gpx version="1.1"><wpt lat="41.28" lon="-70.09"><name>Trailhead</name></wpt></gpx>`

assert.throws(() => gpxToGeoJson(waypointsOnlyGpx), /No tracks or routes found/)
console.log('PASS: waypoints-only file throws')

// Malformed XML should throw.
assert.throws(() => gpxToGeoJson('not xml at all <<<'), /Could not parse/)
console.log('PASS: malformed XML throws')
```

Run:
```bash
cd studio && npx tsx scratch-verify-gpx.ts
```
Expected output: four `PASS:` lines, no errors. `DOMParser` is a Node 24 global (matches the
`node v24.16.0` in this environment), so no jsdom/polyfill is needed for this ad-hoc run — this
matches how the code will actually run in the browser.

- [ ] **Step 3: Fix any failures**

If a `PASS` line doesn't print, read the assertion error, fix `gpxToGeoJson.ts`, and re-run Step 2
until all four pass.

- [ ] **Step 4: Delete the scratch script and type-check**

```bash
rm studio/scratch-verify-gpx.ts
cd studio && npx tsc --noEmit
```
Expected: passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add studio/src/lib/gpxToGeoJson.ts
git commit -m "feat(studio): add GPX-to-GeoJSON conversion utility"
```

---

### Task 3: Build the GPX-aware file input component

**Files:**
- Create: `studio/src/components/GpxAwareFileInput.tsx`

**Interfaces:**
- Consumes: `gpxToGeoJson(gpxText: string): GeoJSON.FeatureCollection` (Task 2); `FileInputProps`,
  `useClient`, `set`, `unset` from `'sanity'`; `useToast`, `Button`, `Card`, `Flex`, `Stack`,
  `Text` from `'@sanity/ui'`.
- Produces: `GpxAwareFileInput` (default export), a React component matching `FileInputProps`,
  for Task 4 to wire in as `components.input` on both `boundaryData` and `trailsData`.

- [ ] **Step 1: Write the component**

```typescript
// studio/src/components/GpxAwareFileInput.tsx
import {useCallback, useRef, useState} from 'react'
import {Button, Card, Flex, Stack, Text, useToast} from '@sanity/ui'
import {type FileInputProps, set, unset, useClient} from 'sanity'
import {gpxToGeoJson} from '../lib/gpxToGeoJson'

/**
 * Wraps the default file input for `boundaryData` / `trailsData`. A `.gpx` selection is
 * converted to GeoJSON client-side before upload — the stored asset is always GeoJSON, the
 * original GPX is never kept. Any other file type uploads unchanged.
 */
export default function GpxAwareFileInput(props: FileInputProps) {
  const {value, onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const isGpx = file.name.toLowerCase().endsWith('.gpx')
        const uploadBlob = isGpx
          ? new Blob([JSON.stringify(gpxToGeoJson(await file.text()))], {
              type: 'application/geo+json',
            })
          : file
        const filename = isGpx ? file.name.replace(/\.gpx$/i, '.geojson') : file.name

        const asset = await client.assets.upload('file', uploadBlob, {filename})
        onChange(set({_type: 'file', asset: {_type: 'reference', _ref: asset._id}}))
        toast.push({
          status: 'success',
          title: isGpx ? 'Converted GPX file and uploaded as GeoJSON' : 'File uploaded',
        })
      } catch (error) {
        toast.push({
          status: 'error',
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [client, onChange, toast],
  )

  return (
    <Stack space={3}>
      {value?.asset?._ref ? (
        <Card padding={3} radius={2} shadow={1} tone="positive">
          <Text size={1}>A file is uploaded. Choose a new file below to replace it.</Text>
        </Card>
      ) : null}
      <Flex gap={2} align="center">
        <Button
          text={uploading ? 'Uploading…' : 'Select file…'}
          disabled={readOnly || uploading}
          onClick={() => inputRef.current?.click()}
        />
        {value?.asset?._ref ? (
          <Button
            text="Remove"
            tone="critical"
            mode="ghost"
            disabled={readOnly || uploading}
            onClick={() => onChange(unset())}
          />
        ) : null}
      </Flex>
      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json,.gpx,application/gpx+xml"
        style={{display: 'none'}}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </Stack>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd studio && npx tsc --noEmit
```
Expected: passes. If `FileInputProps`, `useToast`, or `client.assets.upload`'s signature don't
match, fix the types here based on the compiler's actual error — those are the parts most likely
to need adjustment for the installed `sanity`/`@sanity/ui` versions.

- [ ] **Step 3: Commit**

```bash
git add studio/src/components/GpxAwareFileInput.tsx
git commit -m "feat(studio): add GPX-aware file input component"
```

---

### Task 4: Wire the component into the schema and accept `.gpx`

**Files:**
- Modify: `studio/src/schemaTypes/singletons/projectSettings.ts:47-57` (`boundaryData` field)
- Modify: `studio/src/schemaTypes/singletons/projectSettings.ts:68-78` (`trailsData` field)

**Interfaces:**
- Consumes: `GpxAwareFileInput` from `../../components/GpxAwareFileInput` (Task 3).

- [ ] **Step 1: Update `boundaryData`**

In `studio/src/schemaTypes/singletons/projectSettings.ts`, add the import at the top:

```typescript
import GpxAwareFileInput from '../../components/GpxAwareFileInput'
```

Change the `boundaryData` field (currently lines 47-57) to:

```typescript
    defineField({
      name: 'boundaryData',
      title: 'Boundary data file',
      type: 'file',
      group: 'map',
      description:
        'One GeoJSON FeatureCollection containing every property boundary. Each project then points at a single feature inside it. Replacing this file does not change any project’s assignment, so check for warnings on the projects afterwards. A GPX file is also accepted and converted to GeoJSON automatically on upload — a closed track becomes a boundary polygon.',
      options: {
        accept: '.geojson,.json,application/geo+json,application/json,.gpx,application/gpx+xml',
      },
      components: {
        input: GpxAwareFileInput,
      },
    }),
```

- [ ] **Step 2: Update `trailsData`**

Change the `trailsData` field (currently lines 68-78) to:

```typescript
    defineField({
      name: 'trailsData',
      title: 'Trails data file',
      type: 'file',
      group: 'map',
      description:
        'GeoJSON of the trail tracks, drawn as lines beneath the property boundaries. Unlike the boundary file, nothing points into this one - every line in it is drawn. Leave empty to hide the trails layer. A GPX file is also accepted and converted to GeoJSON automatically on upload.',
      options: {
        accept: '.geojson,.json,application/geo+json,application/json,.gpx,application/gpx+xml',
      },
      components: {
        input: GpxAwareFileInput,
      },
    }),
```

- [ ] **Step 3: Type-check and regenerate typegen**

```bash
cd studio && npx tsc --noEmit
```
Expected: passes.

```bash
cd frontend && npm run sanity:typegen
```
Expected: succeeds. `boundaryData`/`trailsData` remain `file` type — the generated query types in
`frontend/sanity.types.ts` and `sanity.schema.json` should show no field-shape change, only
whatever incidental diff `sanity schema extract` produces. Diff the result to confirm nothing
unexpected changed:
```bash
git diff --stat frontend/sanity.types.ts sanity.schema.json studio/sanity.types.ts
```

- [ ] **Step 4: Run the full verification suite**

```bash
cd frontend && npm run type-check && npm run lint
```
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add studio/src/schemaTypes/singletons/projectSettings.ts frontend/sanity.types.ts sanity.schema.json studio/sanity.types.ts
git commit -m "feat(studio): accept GPX uploads for boundary and trails data"
```

---

### Task 5: Manual end-to-end verification in a running Studio

**Files:** none (verification only — no code changes expected unless a bug surfaces, in which case
fix it in the file from the task above where it was introduced, then re-run this task).

**Interfaces:** none.

- [ ] **Step 1: Build a small real-world-shaped test GPX file**

Create `studio/scratch-test-boundary.gpx` (temporary, not committed):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="manual-test">
  <trk>
    <name>Test Parcel A</name>
    <trkseg>
      <trkpt lat="41.2835" lon="-70.0995"></trkpt>
      <trkpt lat="41.2840" lon="-70.0990"></trkpt>
      <trkpt lat="41.2838" lon="-70.1000"></trkpt>
      <trkpt lat="41.2835" lon="-70.0995"></trkpt>
    </trkseg>
  </trk>
</gpx>
```

- [ ] **Step 2: Start Studio locally and confirm to the user it's running**

Per this project's standing instructions, do not leave a preview server running for the user and
do not start one on their behalf for review — instead, tell the user to run:
```bash
cd studio && npm run dev
```
Ask them to open Project Settings, upload `studio/scratch-test-boundary.gpx` into the Boundary
data file field, and confirm:
- An upload success toast appears mentioning conversion.
- The stored file is `.geojson`, not `.gpx` (check the asset filename shown in the field).
- Setting `boundaryIdProperty` to `name` and opening `BoundaryIdInput` on a project shows "Test
  Parcel A" as an available option.

- [ ] **Step 3: Confirm frontend rendering**

Ask the user to point a project's `boundaryId` at the new feature, run the frontend dev server
themselves (`cd frontend && npm run dev`), and confirm the polygon renders on `/map` — verifying
the closed-loop-to-Polygon conversion actually reaches Mapbox correctly, per this project's
"verify visual changes in the browser" rule.

- [ ] **Step 4: Clean up the scratch file**

```bash
rm studio/scratch-test-boundary.gpx
```

- [ ] **Step 5: Final commit (if any fixes were made during verification)**

If Steps 2-3 surfaced a bug and you fixed it in an earlier task's file:
```bash
git add -A
git commit -m "fix(studio): <describe the fix from manual verification>"
```
If no fixes were needed, skip this step — there is nothing to commit.
