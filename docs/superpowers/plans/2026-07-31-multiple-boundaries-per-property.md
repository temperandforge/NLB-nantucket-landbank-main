# Multiple Boundaries Per Property Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `project` document reference more than one feature in the shared boundary GeoJSON file, so a property spanning several disjoint parcels can be fully represented on the map.

**Architecture:** `project.boundaryId` (single string) is replaced by `project.boundaryIds` (array of strings). A new Studio array-level input component, `BoundaryIdsInput.tsx`, replaces `BoundaryIdInput.tsx`, keeping the same searchable/validated picker per row plus a new cross-project uniqueness warning. Existing data is migrated by a one-off idempotent script. The frontend's per-project polygon-building loop iterates the array instead of handling a single id.

**Tech Stack:** Sanity Studio (React 19, `sanity` v5, `@sanity/ui`), Next.js frontend, TypeScript, GROQ. No new dependencies.

## Global Constraints

- `boundaryId` is replaced, not kept alongside a new field — one field, one concept.
- Existing data must be migrated (not left stale): every project's `boundaryId` becomes a
  one-item `boundaryIds` array, and the old field is removed.
- The picker keeps the current per-boundary search/validation experience (reads the uploaded
  file, offers real identifiers, flags an id no longer in the file) — this is not replaced with a
  plain tag-style array input.
- A boundary id already used by a different project must be flagged (warning, not a hard
  validation error) — new behavior, not present on the old single-value field.
- Duplicate ids within the same property's own list must not be selectable.
- A property's map polygons are the union of all its `boundaryIds`; clicking any one opens that
  property's popup (reuses the existing `projectByFeatureIdRef` mechanism).
- The temporary all-boundaries amber layer must exclude every id in every project's
  `boundaryIds`, not just one per project.
- No test framework exists in this repo — verify with `npx tsc --noEmit` (studio),
  `npm run sanity:typegen` / `type-check` / `lint` (frontend), and manual verification.

---

### Task 1: Schema change and the new multi-boundary picker

**Files:**
- Modify: `studio/src/schemaTypes/documents/project.ts`
- Create: `studio/src/components/BoundaryIdsInput.tsx`
- Delete: `studio/src/components/BoundaryIdInput.tsx`
- Modify: `docs/DECISIONS.md` (§1.9, §1.11)

**Interfaces:**
- Produces: `project.boundaryIds: string[]` (schema field), consumed by Task 2 (migration
  script) and Task 3 (frontend query/rendering).
- Produces: `BoundaryIdsInput` (named export), wired as `project.ts`'s `boundaryIds` field
  `components.input`.

- [ ] **Step 1: Write the new picker component**

Create `studio/src/components/BoundaryIdsInput.tsx`:

```typescript
import {useEffect, useMemo, useState} from 'react'
import {AddIcon, TrashIcon} from '@sanity/icons'
import {Autocomplete, Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {set, unset, useClient, useFormValue, type ArrayOfPrimitivesInputProps} from 'sanity'

/**
 * Picker for a project's boundaries in the uploaded map data file - a project may span more than
 * one feature, so this is a repeatable list of the same per-row search/validation experience
 * BoundaryIdInput used to provide for a single value.
 *
 * Which feature property holds the identifier is configurable (`boundaryIdProperty` on Project
 * Settings) because the client's file schema is not ours to assume.
 */

const SETTINGS_QUERY = `*[_type == "projectSettings" && _id == "projectSettings"][0]{
  "url": boundaryData.asset->url,
  "idProperty": coalesce(boundaryIdProperty, "id")
}`

/** Feature property names tried, in order, for a human-readable label beside the identifier. */
const NAME_KEYS = ['name', 'NAME', 'Name', 'title', 'TITLE', 'label']

type BoundaryOption = {value: string; label: string}

type LoadState =
  | {status: 'loading'}
  | {status: 'ready'; options: BoundaryOption[]}
  | {status: 'notice'; message: string}

export function BoundaryIdsInput(props: ArrayOfPrimitivesInputProps<string>) {
  const {value, onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-09-25'})
  const documentId = useFormValue(['_id']) as string | undefined
  const [state, setState] = useState<LoadState>({status: 'loading'})
  const [otherOwners, setOtherOwners] = useState<Map<string, string[]>>(new Map())

  const boundaryIds = value ?? []

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

  useEffect(() => {
    let cancelled = false
    const currentId = (documentId ?? '').replace(/^drafts\./, '')

    async function loadOtherOwners() {
      if (!currentId) return
      const others = await client.fetch<{name: string; boundaryIds: string[] | null}[]>(
        `*[_type == "project" && !(_id in [$id, "drafts." + $id])]{name, boundaryIds}`,
        {id: currentId},
      )
      if (cancelled) return
      const owners = new Map<string, string[]>()
      for (const other of others) {
        for (const id of other.boundaryIds ?? []) {
          const names = owners.get(id) ?? []
          names.push(other.name || 'Untitled')
          owners.set(id, names)
        }
      }
      setOtherOwners(owners)
    }

    loadOtherOwners()
    return () => {
      cancelled = true
    }
  }, [client, documentId])

  const orphanedIds = useMemo(() => {
    if (state.status !== 'ready') return new Set<string>()
    const known = new Set(state.options.map((option) => option.value))
    return new Set(boundaryIds.filter((id) => !known.has(id)))
  }, [boundaryIds, state])

  function setRow(index: number, nextValue: string | null) {
    if (!nextValue) return
    onChange(set(boundaryIds.map((id, i) => (i === index ? nextValue : id))))
  }

  function removeRow(index: number) {
    const next = boundaryIds.filter((_, i) => i !== index)
    onChange(next.length ? set(next) : unset())
  }

  function addRow() {
    onChange(set([...boundaryIds, '']))
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
        {boundaryIds.length ? (
          <Text size={1} muted>
            Current values: <code>{boundaryIds.join(', ')}</code>
          </Text>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack space={3}>
      {boundaryIds.map((id, index) => {
        const otherNames = otherOwners.get(id)
        const rowOptions = state.options.filter(
          (option) => option.value === id || !boundaryIds.includes(option.value),
        )
        return (
          <Stack space={2} key={index}>
            <Flex gap={2} align="center">
              <Box flex={1}>
                <Autocomplete
                  options={rowOptions}
                  value={id}
                  placeholder="Search boundaries…"
                  openButton
                  readOnly={readOnly}
                  filterOption={(query, option) =>
                    option.label.toLowerCase().includes(query.toLowerCase()) ||
                    option.value.toLowerCase().includes(query.toLowerCase())
                  }
                  renderOption={(option) => (
                    <Card as="button" padding={3} radius={2}>
                      <Text size={1}>{option.label}</Text>
                    </Card>
                  )}
                  onChange={(nextValue: string | null) => setRow(index, nextValue)}
                />
              </Box>
              <Button
                icon={TrashIcon}
                mode="ghost"
                tone="critical"
                disabled={readOnly}
                onClick={() => removeRow(index)}
                aria-label="Remove boundary"
              />
            </Flex>
            {orphanedIds.has(id) ? (
              <Card padding={3} radius={2} shadow={1} tone="critical">
                <Text size={1}>
                  &ldquo;{id}&rdquo; is not in the uploaded boundary file, so it will not draw on
                  the map.
                </Text>
              </Card>
            ) : null}
            {otherNames?.length ? (
              <Card padding={3} radius={2} shadow={1} tone="caution">
                <Text size={1}>
                  Also assigned to: {otherNames.join(', ')}. Check this is intentional.
                </Text>
              </Card>
            ) : null}
          </Stack>
        )
      })}
      <Box>
        <Button
          icon={AddIcon}
          text="Add boundary"
          mode="ghost"
          disabled={readOnly}
          onClick={addRow}
        />
      </Box>
      <Text size={1} muted>
        {state.options.length} boundaries available.
      </Text>
    </Stack>
  )
}
```

Note: `ArrayOfPrimitivesInputProps<string>` is the expected type name for a custom input on an
array-of-primitives field, but verify it against the installed `sanity` package's actual exports
(this is an npm workspaces monorepo — real types are at the repo root's `node_modules/sanity`, not
`studio/node_modules` which is empty) via `npx tsc --noEmit` in Step 4. If the exact type name or
shape differs, adjust the import/prop typing to match what actually compiles — the behavior
described above (read `value`/`onChange`/`readOnly`, no other props needed) is what matters, not
the exact type name.

- [ ] **Step 2: Delete the old single-value component**

```bash
rm studio/src/components/BoundaryIdInput.tsx
```

- [ ] **Step 3: Update the schema field**

Open `studio/src/schemaTypes/documents/project.ts`. Change the import at the top:

```typescript
import {BoundaryIdInput} from '../../components/BoundaryIdInput'
```

to:

```typescript
import {BoundaryIdsInput} from '../../components/BoundaryIdsInput'
```

Also update the file's top doc-comment, which currently ends with:

```
 * boundaryId below.
 */
```

to:

```
 * boundaryIds below.
 */
```

Replace the `boundaryId` field:

```typescript
    defineField({
      name: 'boundaryId',
      title: 'Property map ID',
      type: 'string',
      group: 'map',
      description:
        'Which boundary in the uploaded map data file belongs to this property. Pick from the list rather than typing - an identifier that is not in the file draws nothing on the map.',
      components: {
        input: BoundaryIdInput,
      },
    }),
```

with:

```typescript
    defineField({
      name: 'boundaryIds',
      title: 'Property map IDs',
      type: 'array',
      group: 'map',
      of: [defineArrayMember({type: 'string'})],
      description:
        'Which boundaries in the uploaded map data file belong to this property - a property can span more than one. Pick from the list rather than typing; an identifier that is not in the file draws nothing on the map.',
      components: {
        input: BoundaryIdsInput,
      },
    }),
```

Replace the `preview` block:

```typescript
  preview: {
    select: {
      name: 'name',
      boundaryId: 'boundaryId',
    },
    prepare({name, boundaryId}) {
      return {
        title: name || 'Untitled',
        // Surfaces the commonest data gap - a property with no boundary assigned - in the list,
        // without having to open each one.
        subtitle: boundaryId ? `Boundary: ${boundaryId}` : 'No boundary assigned',
      }
    },
  },
```

with:

```typescript
  preview: {
    select: {
      name: 'name',
      boundaryIds: 'boundaryIds',
    },
    prepare({name, boundaryIds}) {
      const count = Array.isArray(boundaryIds) ? boundaryIds.length : 0
      return {
        title: name || 'Untitled',
        // Surfaces the commonest data gap - a property with no boundary assigned - in the list,
        // without having to open each one.
        subtitle: count
          ? `${count} boundar${count === 1 ? 'y' : 'ies'} assigned`
          : 'No boundary assigned',
      }
    },
  },
```

- [ ] **Step 4: Type-check**

```bash
cd studio && npx tsc --noEmit
```

Expected: passes. If `ArrayOfPrimitivesInputProps` (or `useFormValue`) doesn't match the installed
`sanity` package's exports, fix the type import/name in `BoundaryIdsInput.tsx` based on the actual
compiler error, then re-run this command until it passes.

- [ ] **Step 5: Update the durable decisions record**

Open `docs/DECISIONS.md`. In section "1.9 Boundary geometry lives in one file, not on the
documents", find:

```
The client maintains a single GeoJSON FeatureCollection covering every boundary, uploaded to
`projectSettings.boundaryData`. Each project stores only `boundaryId`, naming one feature in it.
```

Replace with:

```
The client maintains a single GeoJSON FeatureCollection covering every boundary, uploaded to
`projectSettings.boundaryData`. Each project stores `boundaryIds`, an array naming one or more
features in it - a property can span more than one disjoint parcel in the client's file.
```

In section "1.11 The boundary picker reads the real file", find:

```
`boundaryId` uses a custom Studio input (`studio/src/components/BoundaryIdInput.tsx`) that loads the
uploaded file, offers the identifiers it actually contains, and flags a stored value that is not
among them.
```

Replace with:

```
`boundaryIds` uses a custom Studio input (`studio/src/components/BoundaryIdsInput.tsx`) that loads
the uploaded file, offers the identifiers it actually contains per row, flags a stored value that
is not among them, and warns if a value is already assigned to a different project.
```

- [ ] **Step 6: Commit**

```bash
git add studio/src/schemaTypes/documents/project.ts studio/src/components/BoundaryIdsInput.tsx docs/DECISIONS.md
git rm studio/src/components/BoundaryIdInput.tsx
git commit -m "$(cat <<'EOF'
feat(studio): replace boundaryId with a multi-value boundaryIds field

A property can span more than one disjoint parcel in the client's
boundary file. BoundaryIdsInput replaces BoundaryIdInput, keeping the
same per-row search/validation experience as a repeatable list, plus a
new warning when a boundary id is already assigned to a different
project.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Migrate existing data

**Files:**
- Create: `studio/scripts/migrateBoundaryIdToBoundaryIds.ts`

**Interfaces:**
- Consumes: the `boundaryIds` field defined on `project` in Task 1 (content-lake level; this
  script writes raw field names via GROQ/patch and does not import any TypeScript types from
  Task 1's files).

- [ ] **Step 1: Write the migration script**

Create `studio/scripts/migrateBoundaryIdToBoundaryIds.ts`:

```typescript
/**
 * Converts every project's `boundaryId` (single string) into `boundaryIds` (array), then removes
 * the old field. One-off migration for the boundaryId -> boundaryIds schema change - see
 * docs/superpowers/specs/2026-07-31-multiple-boundaries-per-property-design.md.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateBoundaryIdToBoundaryIds.ts --with-user-token
 *
 * Idempotent. Only touches a project that still has `boundaryId` set and no `boundaryIds` yet - a
 * project already migrated (or created fresh with boundaryIds) is left untouched on a re-run.
 *
 * Pass --dry to print the plan without writing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const BATCH_SIZE = 50

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const toMigrate = await client.fetch<{_id: string; boundaryId: string}[]>(
    `*[_type == "project" && defined(boundaryId) && !defined(boundaryIds)]{_id, boundaryId}`,
  )

  console.log(`${toMigrate.length} project(s) to migrate.`)

  if (DRY_RUN) {
    for (const doc of toMigrate.slice(0, 5)) {
      console.log(
        `  + would set boundaryIds: ["${doc.boundaryId}"] and unset boundaryId on ${doc._id}`,
      )
    }
    if (toMigrate.length > 5) console.log(`  ...and ${toMigrate.length - 5} more.`)
    console.log('\nDry run complete.')
    return
  }

  let migrated = 0
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()
    for (const doc of batch) {
      tx.patch(doc._id, (patch) => patch.set({boundaryIds: [doc.boundaryId]}).unset(['boundaryId']))
    }
    await tx.commit()
    migrated += batch.length
    console.log(`  + migrated ${migrated}/${toMigrate.length}`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check**

```bash
cd studio && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 3: Dry-run against real data**

```bash
cd studio && npx sanity exec scripts/migrateBoundaryIdToBoundaryIds.ts --with-user-token -- --dry
```

Expected: reports the count of projects with a `boundaryId` still needing migration (523, unless
already changed) and a sample of what would be set/unset. Read the output before proceeding.

- [ ] **Step 4: Run it for real**

```bash
cd studio && npx sanity exec scripts/migrateBoundaryIdToBoundaryIds.ts --with-user-token
```

Expected: reports batches of ~50 migrated at a time, ending in "Done."

- [ ] **Step 5: Verify**

```bash
cd studio && npx sanity documents query 'count(*[_type == "project" && defined(boundaryId)])'
cd studio && npx sanity documents query 'count(*[_type == "project" && defined(boundaryIds)])'
```

Expected: the first count is `0`, the second matches the total number of projects that had a
boundary assigned before this migration.

- [ ] **Step 6: Commit**

```bash
git add studio/scripts/migrateBoundaryIdToBoundaryIds.ts
git commit -m "$(cat <<'EOF'
feat(studio): add and run boundaryId -> boundaryIds migration script

Converts every existing project's single boundaryId into a one-item
boundaryIds array, then removes the old field, so no project is left on
the old shape after the schema change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update the frontend to consume `boundaryIds`

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (the `projectsQuery` projection)
- Modify: `frontend/app/map/MapboxMap.tsx` (the per-project polygon-building loop)

**Interfaces:**
- Consumes: `project.boundaryIds: string[] | null` (from the regenerated `ProjectsQueryResult`
  type, via `Project` in `frontend/app/map/types.ts`), and the existing
  `projectByFeatureIdRef: React.RefObject<Map<number, Project>>`,
  `assignedBoundaryIds: Set<string>`, `boundaries: BoundaryIndex` already in `MapboxMap.tsx`.

- [ ] **Step 1: Update the GROQ projection**

Open `frontend/sanity/lib/queries.ts`. Find this line inside `projectsQuery` (currently around
line 120):

```typescript
    boundaryId,
```

Replace it with:

```typescript
    boundaryIds,
```

- [ ] **Step 2: Regenerate types**

```bash
cd frontend && npm run sanity:typegen
```

Expected: succeeds; `frontend/sanity.types.ts` now has `boundaryIds: string[] | null` (or similar)
on the projects query result instead of `boundaryId`.

- [ ] **Step 3: Update the per-project loop in `MapboxMap.tsx`**

Open `frontend/app/map/MapboxMap.tsx`. Find this block inside `renderMarkersAndGeojson()`
(currently around line 266-297):

```typescript
      for (const project of projects) {
        if (project.boundaryId) assignedBoundaryIds.add(project.boundaryId)
        const boundary = project.boundaryId ? boundaries.get(project.boundaryId) : undefined

        let featureId: number | undefined
        if (boundary?.geometry) {
          featureId = features.length
          features.push({
            id: featureId,
            type: 'Feature',
            properties: {id: project.boundaryId, name: project.name},
            geometry: boundary.geometry,
          })
          projectByFeatureIdRef.current.set(featureId, project)
        }

        // Markers are off entirely for now - every property relies on clicking its polygon (see
        // the property-polygons click handler above) to see its popup.
        //
        // TODO(markers): to bring pins back, restore this (previously gated on
        // projectSlugs(project.propertyTypes).includes(PROPERTY_TYPE_SLUG.beach) for beach-only,
        // or unconditionally for everyone):
        //
        //   const position =
        //     toLngLat(project.location) ??
        //     (boundary?.geometry ? geometryCenter(boundary.geometry) : null)
        //   if (!position) continue
        //   const popup = new mapboxgl.Popup({offset: 24}).setHTML(buildPopupHtml(project))
        //   const marker = new mapboxgl.Marker().setLngLat(position).setPopup(popup).addTo(map)
        //   markersRef.current.push(marker)
        //   if (featureId !== undefined) markerEntries.push({featureId, marker})
      }
```

Replace it with:

```typescript
      for (const project of projects) {
        for (const boundaryId of project.boundaryIds ?? []) {
          assignedBoundaryIds.add(boundaryId)
          const boundary = boundaries.get(boundaryId)
          if (!boundary?.geometry) continue

          const featureId = features.length
          features.push({
            id: featureId,
            type: 'Feature',
            properties: {id: boundaryId, name: project.name},
            geometry: boundary.geometry,
          })
          projectByFeatureIdRef.current.set(featureId, project)
        }

        // Markers are off entirely for now - every property relies on clicking its polygon (see
        // the property-polygons click handler above) to see its popup.
        //
        // TODO(markers): to bring pins back, restore something like this per project (previously
        // gated on projectSlugs(project.propertyTypes).includes(PROPERTY_TYPE_SLUG.beach) for
        // beach-only, or unconditionally for everyone) - a project may have several boundaries
        // now, so pick project.location or the first resolved boundary's centre:
        //
        //   const position = toLngLat(project.location) ?? null
        //   if (!position) continue
        //   const popup = new mapboxgl.Popup({offset: 24}).setHTML(buildPopupHtml(project))
        //   const marker = new mapboxgl.Marker().setLngLat(position).setPopup(popup).addTo(map)
        //   markersRef.current.push(marker)
      }
```

- [ ] **Step 4: Type-check and lint**

```bash
cd frontend && npm run type-check && npm run lint
```

Expected: both pass with no errors.

- [ ] **Step 5: Manual verification in the browser**

No test framework exists in this repo. Tell the user (per this project's standing instruction not
to start preview servers for them) to run `cd studio && npm run dev` and `cd frontend && npm run
dev` themselves, then:

- In Studio, open a project and confirm the new "Add boundary" / per-row picker works, including
  removing a row and seeing the cross-project warning when picking an id another project already
  has.
- On `/map`, confirm a project with more than one `boundaryIds` entry shows all of its polygons,
  and clicking any one opens that project's popup.
- Confirm the temporary amber all-boundaries layer no longer includes any id assigned to any
  project (not just the first one each project used to have).

- [ ] **Step 6: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/sanity.types.ts sanity.schema.json studio/sanity.types.ts frontend/app/map/MapboxMap.tsx
git commit -m "$(cat <<'EOF'
feat(map): render every boundary in a project's boundaryIds array

The per-project loop now iterates boundaryIds instead of handling a
single boundaryId, so a property spanning multiple parcels draws all of
them - each still resolves to the same project for the click-to-popup
handler and is excluded from the temporary all-boundaries layer.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
