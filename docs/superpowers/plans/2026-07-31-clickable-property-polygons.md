# Clickable Property Boundary Polygons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor open a project's popup (name/description/image/link) by clicking anywhere inside its boundary polygon on `/map`, not just its marker pin.

**Architecture:** `frontend/app/map/MapboxMap.tsx`'s `renderMarkersAndGeojson()` already computes a numeric `featureId` per project-with-a-boundary and adds it to the `property-geojson` source. This plan adds a `Map<number, Project>` built in that same loop, stored in a ref so a click handler (registered once, in the mount effect, alongside the existing all-boundaries click handler) can resolve a clicked feature back to its full `Project` and reuse the existing `buildPopupHtml`.

**Tech Stack:** Next.js app router, Mapbox GL JS, TypeScript, React `useRef`. Same file already in the codebase — no new dependencies.

## Global Constraints

- Markers, `location`/coordinates, and hover-highlight behavior must not change — this is additive only.
- The popup content on click must be identical to the marker's popup (`buildPopupHtml(project)`), not a stripped-down version.
- The click handler must be registered once (mount effect), not inside `renderMarkersAndGeojson` — that function reruns on every filter/boundary change, and Mapbox GL layer-scoped listeners persist across `removeLayer`/`addLayer` cycles for the same layer id, so re-registering there would stack up duplicate handlers (this is the same reasoning already documented in this file for the existing all-boundaries click handler).
- No test framework exists in this repo — verify with `npm run type-check` / `npm run lint` in `frontend` plus manual browser verification, not automated tests.

---

### Task 1: Add the click handler and its project lookup

**Files:**
- Modify: `frontend/app/map/MapboxMap.tsx:85` (add the ref, next to `markersRef`)
- Modify: `frontend/app/map/MapboxMap.tsx:191-201` (mount effect — add the click handler after the existing all-boundaries click-handler loop)
- Modify: `frontend/app/map/MapboxMap.tsx:219-220` (renderMarkersAndGeojson — reset the ref alongside the marker reset)
- Modify: `frontend/app/map/MapboxMap.tsx:249-258` (renderMarkersAndGeojson — populate the ref in the existing project loop)

**Interfaces:**
- Consumes: the existing `buildPopupHtml(project: Project): string` (line 41) and `Project` type (imported from `./types`) already in this file; the existing `featureId` computed per-project in the existing loop.
- Produces: nothing new for other files — self-contained addition to `MapboxMap.tsx`.

- [ ] **Step 1: Add the ref**

Open `frontend/app/map/MapboxMap.tsx`. Find this line (85):

```typescript
  const markersRef = useRef<mapboxgl.Marker[]>([])
```

Replace it with:

```typescript
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const projectByFeatureIdRef = useRef<Map<number, Project>>(new Map())
```

- [ ] **Step 2: Register the click handler in the mount effect**

Find this block (around line 191-201):

```typescript
    // TODO(all-boundaries): remove with the temporary all-boundaries layers
    for (const layerId of ['all-boundaries-lines', 'all-boundaries-polygons']) {
      map.on('click', layerId, (e) => {
        const boundaryIdValue = e.features?.[0]?.properties?.boundaryIdValue
        if (typeof boundaryIdValue !== 'string') return
        new mapboxgl.Popup({offset: 12})
          .setLngLat(e.lngLat)
          .setHTML(`<div class="map-popup-title">${escapeHtml(boundaryIdValue)}</div>`)
          .addTo(map)
      })
    }

    return () => {
```

Replace it with (adding the new handler after the existing loop, before the `return`):

```typescript
    // TODO(all-boundaries): remove with the temporary all-boundaries layers
    for (const layerId of ['all-boundaries-lines', 'all-boundaries-polygons']) {
      map.on('click', layerId, (e) => {
        const boundaryIdValue = e.features?.[0]?.properties?.boundaryIdValue
        if (typeof boundaryIdValue !== 'string') return
        new mapboxgl.Popup({offset: 12})
          .setLngLat(e.lngLat)
          .setHTML(`<div class="map-popup-title">${escapeHtml(boundaryIdValue)}</div>`)
          .addTo(map)
      })
    }

    /**
     * A project's boundary polygon should open the same popup its marker does - not just the
     * pin. Registered once here, not inside renderMarkersAndGeojson (which reruns on every
     * filter/boundary change), for the same reason as the all-boundaries click handlers above:
     * Mapbox GL layer-scoped listeners persist across removeLayer/addLayer cycles for the same
     * layer id, so registering this inside renderMarkersAndGeojson would stack up duplicate
     * handlers every time it reruns.
     */
    map.on('click', 'property-polygons', (e) => {
      const featureId = e.features?.[0]?.id
      if (typeof featureId !== 'number') return
      const project = projectByFeatureIdRef.current.get(featureId)
      if (!project) return
      new mapboxgl.Popup({offset: 12})
        .setLngLat(e.lngLat)
        .setHTML(buildPopupHtml(project))
        .addTo(map)
    })

    return () => {
```

- [ ] **Step 3: Reset the ref at the start of `renderMarkersAndGeojson`**

Find this block (around line 219-220):

```typescript
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
```

Replace it with:

```typescript
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      projectByFeatureIdRef.current = new Map()
```

- [ ] **Step 4: Populate the ref in the existing project loop**

Find this block (around line 249-258):

```typescript
        let featureId: number | undefined
        if (boundary?.geometry) {
          featureId = features.length
          features.push({
            id: featureId,
            type: 'Feature',
            properties: {id: project.boundaryId, name: project.name},
            geometry: boundary.geometry,
          })
        }
```

Replace it with:

```typescript
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
```

Do not change anything else in this loop (marker/position/popup construction below this block
stays exactly as it is today).

- [ ] **Step 5: Type-check and lint**

```bash
cd frontend && npm run type-check && npm run lint
```

Expected: both pass with no errors.

- [ ] **Step 6: Manual verification in the browser**

No test framework exists in this repo. Tell the user (per this project's standing instruction not
to start preview servers for them) to run `cd frontend && npm run dev` themselves, open `/map`,
and confirm:

- Clicking inside an assigned project's blue polygon, away from its marker pin, opens a popup with
  that project's full content (name, description if any, image if any, link if any) — the same
  content its marker's popup shows.
- The marker pin, hover-highlight-on-marker-hover behavior, and `location`-based marker placement
  are all still exactly as before this change.
- Clicking the amber "all boundaries" shapes still shows their own `track_N`-style popup, unaffected
  by this change.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/map/MapboxMap.tsx
git commit -m "$(cat <<'EOF'
feat(map): open a project's popup when clicking its boundary polygon

Previously only the marker pin opened a project's popup. A visitor can
now click anywhere inside the assigned boundary polygon to see the same
content - reuses buildPopupHtml via a featureId-to-project lookup built
alongside the existing property-geojson feature construction.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
