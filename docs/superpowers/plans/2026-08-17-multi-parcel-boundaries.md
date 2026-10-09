# Multi-Parcel Project Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `project` point at multiple GIS parcels (not just one), and reseed the `project`
collection from the real boundary file so every distinct property in it has a project with all its
parcels assigned.

**Architecture:** `project.boundaryId` (string) becomes `project.boundaryIds` (string array). The
Studio picker becomes a multi-select built on a shared data-loading hook. The frontend resolves
every id in the array to a boundary feature and unions their hover/highlight state. A one-off
script deletes the current 44 `project` documents and recreates one project per distinct `Name` in
the boundary file, each with the full set of matching FIDs as `boundaryIds`.

**Tech Stack:** Sanity Studio (React, `sanity` package, `@sanity/ui`), Next.js frontend
(TypeScript, `mapbox-gl`), `sanity exec` scripts run with `--with-user-token`.

**Spec:** [docs/superpowers/specs/2026-08-17-multi-parcel-boundaries-design.md](../specs/2026-08-17-multi-parcel-boundaries-design.md)

## Global Constraints

- No test framework exists in this repo. Verification is `npm run sanity:typegen`,
  `npm run type-check`, `npm run lint` in `frontend`, and `npx tsc --noEmit` in `studio` — run
  these instead of a test suite at the end of every task that touches type-checked code.
- Content scripts run via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token`.
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are
  build artifacts — regenerate with `npm run sanity:typegen` in `frontend`, never hand-edit.
- `boundaryIdProperty` on the live Project Settings document is `"FID"` — the reseed script must
  assert this and fail loudly if it's ever anything else.
- Only singletons get explicit `_id`s; `project` documents get generated ids.
- The `project.slug` field is required (`Rule.required()`), so every created project needs one.

---

### Task 1: Schema — `boundaryId` → `boundaryIds`

**Files:**
- Modify: `studio/src/schemaTypes/documents/project.ts:15` (comment referencing `boundaryId`),
  `studio/src/schemaTypes/documents/project.ts:94-103` (the field definition),
  `studio/src/schemaTypes/documents/project.ts:111-125` (preview `select`/`prepare`)
- Create: `studio/src/components/useBoundaryOptions.ts`
- Create: `studio/src/components/BoundaryIdsInput.tsx`
- Delete: `studio/src/components/BoundaryIdInput.tsx`

**Interfaces:**
- Produces: `useBoundaryOptions(): {status: 'loading'} | {status: 'ready'; options: {value:
  string; label: string}[]} | {status: 'notice'; message: string}` — a hook other Studio
  components can reuse.
- Produces: `BoundaryIdsInput` — a `components.input` for an `array` of `string` field, following
  Sanity's `ArrayOfPrimitivesInputProps` contract (has `.value?: string[]`, `.onChange`,
  `.elementProps`, `.readOnly`, same shape as the `StringInputProps` the old component used, but
  the array-typed sibling of it).

- [ ] **Step 1: Extract the data-loading hook**

Create `studio/src/components/useBoundaryOptions.ts`:

```ts
import {useEffect, useState} from 'react'
import {useClient} from 'sanity'

/**
 * Loads the identifiers available in the uploaded boundary file, for any Studio input that needs
 * to offer them. Shared by every boundary picker so the fetch-and-index logic exists once.
 */

const SETTINGS_QUERY = `*[_type == "projectSettings" && _id == "projectSettings"][0]{
  "url": boundaryData.asset->url,
  "idProperty": coalesce(boundaryIdProperty, "id")
}`

/** Feature property names tried, in order, for a human-readable label beside the identifier. */
const NAME_KEYS = ['name', 'NAME', 'Name', 'title', 'TITLE', 'label']

export type BoundaryOption = {value: string; label: string}

export type BoundaryOptionsState =
  | {status: 'loading'}
  | {status: 'ready'; options: BoundaryOption[]}
  | {status: 'notice'; message: string}

export function useBoundaryOptions(): BoundaryOptionsState {
  const client = useClient({apiVersion: '2025-09-25'})
  const [state, setState] = useState<BoundaryOptionsState>({status: 'loading'})

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
          SETTINGS_QUERY,
        )

        if (!settings?.url) {
          if (!cancelled) {
            setState({
              status: 'notice',
              message:
                'No boundary data file has been uploaded yet. Add one under Projects → Project Settings, then reopen this project.',
            })
          }
          return
        }

        const idProperty = settings.idProperty || 'id'
        const response = await fetch(settings.url)
        if (!response.ok) {
          throw new Error(`Could not download the boundary file (${response.status}).`)
        }
        const geojson = await response.json()
        const features: unknown[] = Array.isArray(geojson?.features) ? geojson.features : []

        const options: BoundaryOption[] = []
        const seen = new Set<string>()
        for (const feature of features) {
          const featureProps = (feature as {properties?: Record<string, unknown>})?.properties
          const rawId = featureProps?.[idProperty]
          if (rawId === undefined || rawId === null || rawId === '') continue
          const id = String(rawId)
          if (seen.has(id)) continue
          seen.add(id)
          const nameKey = NAME_KEYS.find((key) => typeof featureProps?.[key] === 'string')
          const name = nameKey ? String(featureProps?.[nameKey]) : undefined
          options.push({value: id, label: name ? `${name} — ${id}` : id})
        }

        if (cancelled) return

        if (!options.length) {
          setState({
            status: 'notice',
            message: `The uploaded file has ${features.length} feature(s), but none carry a "${idProperty}" property. Check the Boundary ID property setting under Project Settings.`,
          })
          return
        }

        setState({status: 'ready', options})
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'notice',
          message:
            error instanceof Error ? error.message : 'Could not read the boundary data file.',
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client])

  return state
}
```

This is a lossless extraction of the fetch/index logic already in `BoundaryIdInput.tsx` — no
behavior change yet.

- [ ] **Step 2: Write `BoundaryIdsInput`**

Create `studio/src/components/BoundaryIdsInput.tsx`:

```tsx
import {Autocomplete, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {ArrayOfPrimitivesInputProps} from 'sanity'
import {set, unset} from 'sanity'

import {useBoundaryOptions} from './useBoundaryOptions'

/**
 * Picker for a project's parcels in the uploaded map data file. A property can be made of several
 * separate GIS parcels sharing one name (e.g. 28 features named "Smooth Hummocks Coastal
 * Preserve"), so this is a multi-select rather than the single-value picker it replaces: an
 * autocomplete to add a parcel, plus the ones already picked as a removable chip list.
 *
 * Each chip is checked against the uploaded file independently, so a stale assignment on a
 * project with several parcels shows exactly which one no longer exists, not a blanket warning.
 */
export function BoundaryIdsInput(props: ArrayOfPrimitivesInputProps<string>) {
  const {value, onChange, elementProps, readOnly} = props
  const state = useBoundaryOptions()
  const selected = value ?? []

  function addId(id: string) {
    if (selected.includes(id)) return
    onChange(set([...selected, id]))
  }

  function removeId(id: string) {
    const next = selected.filter((existing) => existing !== id)
    onChange(next.length ? set(next) : unset())
  }

  if (state.status === 'loading') {
    return (
      <Flex align="center" gap={2} paddingY={2}>
        <Spinner muted />
        <Text size={1} muted>
          Reading boundary data…
        </Text>
      </Flex>
    )
  }

  if (state.status === 'notice') {
    return (
      <Stack space={3}>
        <Card padding={3} radius={2} shadow={1} tone="caution">
          <Text size={1}>{state.message}</Text>
        </Card>
        {selected.length ? (
          <Stack space={2}>
            {selected.map((id) => (
              <Text key={id} size={1} muted>
                Current value: <code>{id}</code>
              </Text>
            ))}
          </Stack>
        ) : null}
      </Stack>
    )
  }

  const labelById = new Map(state.options.map((option) => [option.value, option.label]))
  const availableOptions = state.options.filter((option) => !selected.includes(option.value))

  return (
    <Stack space={3}>
      <Autocomplete
        id={elementProps.id}
        ref={elementProps.ref}
        onBlur={elementProps.onBlur}
        onFocus={elementProps.onFocus}
        readOnly={readOnly}
        options={availableOptions}
        value=""
        placeholder="Search parcels to add…"
        openButton
        filterOption={(query, option) =>
          option.label.toLowerCase().includes(query.toLowerCase()) ||
          option.value.toLowerCase().includes(query.toLowerCase())
        }
        renderOption={(option) => (
          <Card as="button" padding={3} radius={2}>
            <Text size={1}>{option.label}</Text>
          </Card>
        )}
        onChange={(nextValue: string | null) => {
          if (nextValue) addId(nextValue)
        }}
      />
      <Stack space={2}>
        {selected.map((id) => {
          const isOrphaned = !labelById.has(id)
          return (
            <Card
              key={id}
              padding={3}
              radius={2}
              shadow={1}
              tone={isOrphaned ? 'critical' : 'default'}
            >
              <Flex align="center" justify="space-between" gap={3}>
                <Text size={1}>
                  {isOrphaned
                    ? `"${id}" is not in the uploaded boundary file`
                    : labelById.get(id)}
                </Text>
                <Card
                  as="button"
                  padding={2}
                  radius={2}
                  tone="default"
                  onClick={() => removeId(id)}
                >
                  <Text size={1}>Remove</Text>
                </Card>
              </Flex>
            </Card>
          )
        })}
        {!selected.length ? (
          <Text size={1} muted>
            No parcels assigned yet.
          </Text>
        ) : null}
      </Stack>
      <Text size={1} muted>
        {availableOptions.length} of {state.options.length} boundaries available to add.
      </Text>
    </Stack>
  )
}
```

- [ ] **Step 3: Delete the old single-value input**

```bash
rm studio/src/components/BoundaryIdInput.tsx
```

- [ ] **Step 4: Update the `project` schema**

In `studio/src/schemaTypes/documents/project.ts`, change the import:

```ts
import {BoundaryIdsInput} from '../../components/BoundaryIdsInput'
```

Change the field definition (was `name: 'boundaryId'`, `type: 'string'`, `components: {input:
BoundaryIdInput}`):

```ts
    defineField({
      name: 'boundaryIds',
      title: 'Property map IDs',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      group: 'map',
      description:
        'Which boundaries in the uploaded map data file belong to this property — usually one, sometimes several separate parcels. Pick from the list rather than typing; an identifier that is not in the file draws nothing on the map.',
      components: {
        input: BoundaryIdsInput,
      },
    }),
```

Update the doc comment at the top of the file (currently references `boundaryId below`) to say
`boundaryIds below`.

Update the `preview` block:

```ts
  preview: {
    select: {
      name: 'name',
      boundaryIds: 'boundaryIds',
    },
    prepare({name, boundaryIds}) {
      const count = Array.isArray(boundaryIds) ? boundaryIds.length : 0
      return {
        title: name || 'Untitled',
        subtitle: count
          ? `${count} boundar${count === 1 ? 'y' : 'ies'} assigned`
          : 'No boundary assigned',
      }
    },
  },
```

- [ ] **Step 5: Type-check the Studio**

Run: `cd studio && npx tsc --noEmit`
Expected: no errors referencing `BoundaryIdInput`, `boundaryId`, or the deleted file.

- [ ] **Step 6: Commit**

```bash
git add studio/src/schemaTypes/documents/project.ts studio/src/components/useBoundaryOptions.ts studio/src/components/BoundaryIdsInput.tsx
git rm studio/src/components/BoundaryIdInput.tsx
git commit -m "feat(studio): support multiple boundary parcels per project"
```

---

### Task 2: Frontend query + generated types

**Files:**
- Modify: `frontend/sanity/lib/queries.ts:105-128` (`projectsQuery` doc comment and projection)
- Modify (generated, do not hand-edit content): `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Consumes: the `boundaryIds` schema field from Task 1.
- Produces: `ProjectsQueryResult[number]['boundaryIds']: string[] | null`, which
  `frontend/app/map/types.ts`'s `Project` type picks up automatically (it's derived from
  `ProjectsQueryResult`, no edit needed there).

- [ ] **Step 1: Update the query**

In `frontend/sanity/lib/queries.ts`, change the doc comment above `projectsQuery` (currently "...
boundaryId says which feature...") to "... boundaryIds says which features...", and change the
projection:

```ts
export const projectsQuery = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    boundaryIds,
    location,
    description,
    link,
    "image": image{"url": asset->url, alt},
    "propertyTypes": propertyTypes[]->{"slug": slug.current, title},
    "resources": resources[]->{"slug": slug.current, title}
  }
`)
```

- [ ] **Step 2: Regenerate types**

Run: `cd frontend && npm run sanity:typegen`
Expected: completes without error; `git diff --stat` shows changes in `frontend/sanity.types.ts`,
`studio/sanity.types.ts`, and `sanity.schema.json` reflecting `boundaryIds` instead of
`boundaryId`.

- [ ] **Step 3: Type-check the frontend**

Run: `cd frontend && npm run type-check`
Expected: fails here — `frontend/app/map/MapboxMap.tsx` still reads `project.boundaryId`. This
confirms the generated type changed; Task 4 fixes the consumer.

- [ ] **Step 4: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts studio/sanity.types.ts sanity.schema.json
git commit -m "feat(frontend): query boundaryIds instead of boundaryId"
```

---

### Task 3: `geometryCenterOfMany` in `boundaries.ts`

**Files:**
- Modify: `frontend/app/map/boundaries.ts`

**Interfaces:**
- Consumes: `GeoJSON.Geometry`, the existing `collectPositions(geometry: GeoJSON.Geometry):
  [number, number][]` helper already in this file.
- Produces: `geometryCenterOfMany(geometries: GeoJSON.Geometry[]): [number, number] | null` —
  used by `MapboxMap.tsx` in Task 4 as the multi-parcel marker fallback.

- [ ] **Step 1: Add the function**

Add to `frontend/app/map/boundaries.ts`, directly below the existing `geometryCenter`:

```ts
/**
 * A representative point across several geometries — the marker fallback for a project made of
 * multiple parcels. Averages every geometry's vertices together rather than averaging their
 * individual centers, so a project with one huge parcel and several slivers isn't pulled toward
 * the slivers.
 */
export function geometryCenterOfMany(geometries: GeoJSON.Geometry[]): [number, number] | null {
  const positions = geometries.flatMap(collectPositions)
  if (!positions.length) return null

  let lng = 0
  let lat = 0
  for (const [x, y] of positions) {
    lng += x
    lat += y
  }
  return [lng / positions.length, lat / positions.length]
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `boundaries.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/map/boundaries.ts
git commit -m "feat(map): add geometryCenterOfMany for multi-parcel projects"
```

---

### Task 4: Rewire `MapboxMap.tsx` for multiple parcels per project

**Files:**
- Modify: `frontend/app/map/MapboxMap.tsx:8` (import), `frontend/app/map/MapboxMap.tsx:189-315`
  (the render effect)

**Interfaces:**
- Consumes: `geometryCenterOfMany` from Task 3; `Project['boundaryIds']: string[] | null` from
  Task 2; `BoundaryIndex = Map<string, GeoJSON.Feature>` (unchanged, from `boundaries.ts`).
- Produces: no new exports — this is the map's internal rendering effect.

- [ ] **Step 1: Update the import**

```ts
import {geometryCenter, geometryCenterOfMany, loadBoundaryIndex, type BoundaryIndex} from './boundaries'
```

- [ ] **Step 2: Rewrite the per-project resolution loop**

Replace the body of `renderMarkersAndGeojson` from the `features`/`markerEntries` declarations
through the end of the `for (const project of projects)` loop (currently
`frontend/app/map/MapboxMap.tsx:210-240`) with:

```ts
      const features: GeoJSON.Feature[] = []
      const markerEntries: {featureIds: number[]; marker: mapboxgl.Marker}[] = []

      for (const project of projects) {
        const projectBoundaries = (project.boundaryIds ?? [])
          .map((id) => boundaries.get(id))
          .filter((feature): feature is GeoJSON.Feature => Boolean(feature?.geometry))

        const featureIds: number[] = []
        for (const boundary of projectBoundaries) {
          const featureId = features.length
          features.push({
            id: featureId,
            type: 'Feature',
            properties: {name: project.name},
            geometry: boundary.geometry,
          })
          featureIds.push(featureId)
        }

        // An explicit marker position wins; otherwise fall back to the combined centre of every
        // parcel assigned to this project. A project with neither gets no marker at all, rather
        // than one at a made-up coordinate.
        const position =
          toLngLat(project.location) ??
          (projectBoundaries.length
            ? geometryCenterOfMany(projectBoundaries.map((boundary) => boundary.geometry))
            : null)

        if (!position) continue

        const popup = new mapboxgl.Popup({offset: 24}).setHTML(buildPopupHtml(project))

        const marker = new mapboxgl.Marker().setLngLat(position).setPopup(popup).addTo(map)
        markersRef.current.push(marker)
        if (featureIds.length) markerEntries.push({featureIds, marker})
      }
```

Note `properties: {name: project.name}` drops the old `id: project.boundaryId` — a feature now
belongs to a project via several ids, so a single `id` property is no longer meaningful; nothing
downstream reads it (only `geometry-type` filters and `feature-state` do).

- [ ] **Step 3: Rewrite the hover wiring**

Replace the hover section (currently `frontend/app/map/MapboxMap.tsx:274-300`, from `let
hoveredStateId` through the end of the `for (const {featureId, marker} of markerEntries)` loop)
with:

```ts
      // Hover wiring runs after the source exists - setFeatureState throws on an unknown source.
      let hoveredStateIds: number[] = []

      for (const {featureIds, marker} of markerEntries) {
        const markerDiv = marker.getElement()

        markerDiv.addEventListener('mouseenter', () => {
          for (const id of hoveredStateIds) {
            map.setFeatureState({source: 'property-geojson', id}, {hover: false})
          }
          hoveredStateIds = featureIds
          for (const id of featureIds) {
            map.setFeatureState({source: 'property-geojson', id}, {hover: true})
          }

          markerDiv.style.transition = 'top .2s ease'
          markerDiv.style.top = '-6px'
          markerDiv.style.cursor = 'pointer'
        })

        markerDiv.addEventListener('mouseleave', () => {
          for (const id of hoveredStateIds) {
            map.setFeatureState({source: 'property-geojson', id}, {hover: false})
          }
          hoveredStateIds = []
          markerDiv.style.top = '0'
          markerDiv.style.cursor = 'auto'
        })
      }
```

- [ ] **Step 4: Type-check and lint**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: both pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/map/MapboxMap.tsx
git commit -m "feat(map): render and hover-highlight every parcel of a multi-parcel project"
```

---

### Task 5: Reseed script

**Files:**
- Create: `studio/scripts/reseedProjectsFromBoundaries.ts`

**Interfaces:**
- Consumes: `getCliClient` from `sanity/cli` (same pattern as every other script in
  `studio/scripts/`); the live `projectSettings` document's `boundaryData.asset->url` and
  `boundaryIdProperty`.
- Produces: nothing consumed by other tasks — this is a one-off operational script, run directly
  by a human via the CLI command in Step 4/5 below.

- [ ] **Step 1: Write the script**

Create `studio/scripts/reseedProjectsFromBoundaries.ts`:

```ts
/**
 * Deletes every existing `project` document and recreates one project per distinct `Name` in the
 * uploaded boundary file, with `boundaryIds` set to every FID sharing that name.
 *
 * This is a one-off destructive reset, not a keyed upsert like the other scripts in this
 * directory - re-running it is safe (it deletes-then-recreates again) but it discards whatever
 * was authored on the existing projects (description, image, link, propertyTypes, resources).
 * That loss was an explicit, confirmed decision for this migration - see
 * docs/superpowers/specs/2026-08-17-multi-parcel-boundaries-design.md.
 *
 * Run with --dry first and read the plan before the real run.
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const isDry = process.argv.includes('--dry')

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{
      "url": boundaryData.asset->url,
      "idProperty": boundaryIdProperty
    }`,
  )
  if (!settings?.url) throw new Error('No boundary file uploaded on Project Settings.')
  if (settings.idProperty !== 'FID') {
    throw new Error(
      `This script assumes boundaryIdProperty is "FID", got "${settings.idProperty}". Update the script's grouping key if the file has changed.`,
    )
  }

  const res = await fetch(settings.url)
  const geojson = await res.json()

  const groups = new Map<string, string[]>()
  const skipped: number[] = []
  for (const feature of geojson.features as {properties: Record<string, unknown>}[]) {
    const name = feature.properties?.Name
    const fid = feature.properties?.FID
    if (typeof name !== 'string' || !name.trim() || fid === undefined || fid === null) {
      skipped.push(Number(fid))
      continue
    }
    const fids = groups.get(name) ?? []
    fids.push(String(fid))
    groups.set(name, fids)
  }

  const usedSlugs = new Set<string>()
  const plan: {name: string; slug: string; boundaryIds: string[]}[] = []
  for (const [name, boundaryIds] of groups) {
    let slug = slugify(name)
    let suffix = 2
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${suffix}`
      suffix++
    }
    usedSlugs.add(slug)
    plan.push({name, slug, boundaryIds})
  }
  plan.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`Planned projects: ${plan.length}`)
  for (const p of plan) {
    console.log(`  ${p.name} (${p.slug}) — ${p.boundaryIds.length} parcel(s)`)
  }
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} feature(s) with no Name: FIDs ${skipped.join(', ')}`)
  }

  const existing = await client.fetch<string[]>(`*[_type == "project"]._id`)
  console.log(`\nExisting projects to delete: ${existing.length}`)

  if (isDry) {
    console.log('\nDry run - no documents were changed.')
    return
  }

  const deleteTx = client.transaction()
  for (const id of existing) deleteTx.delete(id)
  await deleteTx.commit()

  const createTx = client.transaction()
  for (const p of plan) {
    createTx.create({
      _type: 'project',
      name: p.name,
      slug: {_type: 'slug', current: p.slug},
      boundaryIds: p.boundaryIds,
    })
  }
  await createTx.commit()

  console.log(`\nDeleted ${existing.length} project(s), created ${plan.length} project(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check the Studio**

Run: `cd studio && npx tsc --noEmit`
Expected: no errors from the new script.

- [ ] **Step 3: Dry run**

Run: `cd studio && npx sanity exec scripts/reseedProjectsFromBoundaries.ts --with-user-token -- --dry`
Expected: prints the planned project list (grouped by `Name`, one line per group with its parcel
count) and the count of existing projects that would be deleted. Read this output before
continuing — this is the point to sanity-check the grouping (e.g. confirm the "Smooth Hummocks
Coastal Preserve" group shows ~28 parcels) before anything is deleted.

- [ ] **Step 4: Real run**

Run: `cd studio && npx sanity exec scripts/reseedProjectsFromBoundaries.ts --with-user-token`
Expected: logs `Deleted 44 project(s), created N project(s).`

- [ ] **Step 5: Commit the script**

```bash
git add studio/scripts/reseedProjectsFromBoundaries.ts
git commit -m "feat(studio): add script to reseed projects from the boundary file"
```

---

### Task 6: Update DECISIONS.md

**Files:**
- Modify: `docs/DECISIONS.md:121-135` (section 1.9), `docs/DECISIONS.md:153-163` (section 1.11)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update section 1.9**

In `docs/DECISIONS.md`, change section 1.9's second sentence from "Each project stores only
`boundaryId`, naming one feature in it." to "Each project stores `boundaryIds`, naming every
feature in it that belongs to that property — most projects have one, some (e.g. a preserve split
across many GIS parcels) have several." Leave the rest of the section as-is; the configurable
`boundaryIdProperty` reasoning is unchanged.

- [ ] **Step 2: Update section 1.11**

In `docs/DECISIONS.md`, change section 1.11's reference from `boundaryId uses a custom Studio
input (studio/src/components/BoundaryIdInput.tsx)` to `boundaryIds uses a custom Studio input
(studio/src/components/BoundaryIdsInput.tsx, backed by the useBoundaryOptions hook)`, and note
that it is a multi-select — a project can be several parcels, and each is checked against the file
independently so a stale one among several is visible on its own.

- [ ] **Step 3: Commit**

```bash
git add docs/DECISIONS.md
git commit -m "docs: update decisions for multi-parcel boundaryIds"
```

---

### Task 7: End-to-end verification

**Files:** none modified — this task only runs checks.

**Interfaces:** none.

- [ ] **Step 1: Full verification suite**

Run, from the repo root:

```bash
cd frontend && npm run sanity:typegen && npm run type-check && npm run lint
cd ../studio && npx tsc --noEmit
```

Expected: all four commands exit 0.

- [ ] **Step 2: Data verification script**

Create a temporary script (not committed — delete it after running) at
`studio/scripts/_verifyReseed.ts`:

```ts
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

async function main() {
  const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{
      "url": boundaryData.asset->url,
      "idProperty": coalesce(boundaryIdProperty, "id")
    }`,
  )
  const projects = await client.fetch<{name: string; boundaryIds: string[] | null}[]>(
    `*[_type == "project" && defined(slug.current)]{name, boundaryIds}`,
  )

  const res = await fetch(settings!.url!)
  const geojson = await res.json()
  const validIds = new Set<string>()
  for (const feature of geojson.features) {
    const raw = feature.properties?.[settings!.idProperty!]
    if (raw !== undefined && raw !== null && raw !== '') validIds.add(String(raw))
  }

  let totalParcels = 0
  let badParcels = 0
  for (const project of projects) {
    for (const id of project.boundaryIds ?? []) {
      totalParcels++
      if (!validIds.has(id)) {
        badParcels++
        console.log(`BAD: ${project.name} -> ${id} not in file`)
      }
    }
  }

  console.log(`Projects: ${projects.length}`)
  console.log(`Total parcel assignments: ${totalParcels}`)
  console.log(`Assignments not resolving to a real feature: ${badParcels}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

Run: `cd studio && npx sanity exec scripts/_verifyReseed.ts --with-user-token`
Expected: `Assignments not resolving to a real feature: 0`.

Then delete the temporary script: `rm studio/scripts/_verifyReseed.ts`

- [ ] **Step 3: Report to the user**

Summarize: project count before/after, total parcel count, confirmation that all
`boundaryIds` resolve. Note (per prior findings in this project) that visual confirmation in a
browser requires an environment that can reach `api.mapbox.com`, which the sandboxed preview
browser used so far cannot — so this step is data-layer verification, not a screenshot.
