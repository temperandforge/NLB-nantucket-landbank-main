# Render All Boundaries (Temporary) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw every feature in the boundary file on `/map` — not just ones a project's `boundaryId` currently resolves to — as a temporary aid for manually matching the 517 unnamed real-world parcels to project documents.

**Architecture:** A second Mapbox GeoJSON source/pair-of-layers is added inside the existing `renderMarkersAndGeojson()` function in `frontend/app/map/MapboxMap.tsx`, built from the full `boundaries` index already loaded in memory (no new fetch). It renders beneath the existing assigned-project layers, styled distinctly (amber, dashed, low opacity), with a click-to-reveal-name popup wired once in the map's mount effect (not inside `renderMarkersAndGeojson`, which reruns on every filter/boundary change).

**Tech Stack:** Next.js app router, Mapbox GL JS, TypeScript. Same file already in the codebase — no new dependencies.

## Global Constraints

- Assigned boundaries (a project's `boundaryId` resolves to a feature) keep their current behavior exactly as-is: blue fill/line, marker, hover-highlight linkage. This change must not alter `property-geojson`/`property-lines`/`property-polygons` behavior.
- Unassigned boundaries draw amber (`#f59e0b`), dashed line, `fill-opacity: 0.15`, no marker, no hover-highlight.
- Clicking any boundary drawn by the new layers opens a popup showing `feature.properties.name` (e.g. `track_42`).
- The new layers must sit beneath the existing assigned-project layers (added to the map first).
- No toggle, flag, or schema change — this is temporary code removed by hand later.
- No test framework exists in this repo — verify with `npm run type-check` / `npm run lint` in `frontend` plus manual browser verification, not automated tests.

---

### Task 1: Add the all-boundaries layer and click popup

**Files:**
- Modify: `frontend/app/map/MapboxMap.tsx:178-187` (mount effect — add the click listeners)
- Modify: `frontend/app/map/MapboxMap.tsx:199-202` (renderMarkersAndGeojson — add cleanup of the new layers/source)
- Modify: `frontend/app/map/MapboxMap.tsx:240-242` (renderMarkersAndGeojson — add the new source/layers before the existing `property-geojson` block)

**Interfaces:**
- Consumes: the existing `boundaries: BoundaryIndex` (`Map<string, GeoJSON.Feature>`, from `./boundaries`'s `loadBoundaryIndex`) already in scope in this component; the existing `escapeHtml(value: string): string` helper defined at the top of this file (line 27).
- Produces: nothing new for other files — this is a self-contained addition to `MapboxMap.tsx`.

- [ ] **Step 1: Add the click-popup listeners in the mount effect**

Open `frontend/app/map/MapboxMap.tsx`. Find this block (around line 178):

```typescript
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      map.remove()
      mapRef.current = null
    }
```

Replace it with:

```typescript
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    /**
     * Temporary: shows every boundary in the file, not just ones a project points at, so the
     * unnamed real-world parcels (LandBankProperties.gpx converted to track_1, track_2, ...) can
     * be matched to projects by hand. Registered once here, not inside renderMarkersAndGeojson
     * (which reruns on every filter/boundary change) - Mapbox GL layer-scoped listeners persist
     * across removeLayer/addLayer cycles for the same layer id, so registering them there again
     * on every rerun would stack up duplicate handlers.
     *
     * TODO: remove this block, and the matching source/layers in renderMarkersAndGeojson, once
     * every parcel has been matched to a project.
     */
    for (const layerId of ['all-boundaries-lines', 'all-boundaries-polygons']) {
      map.on('click', layerId, (e) => {
        const name = e.features?.[0]?.properties?.name
        if (typeof name !== 'string') return
        new mapboxgl.Popup({offset: 12})
          .setLngLat(e.lngLat)
          .setHTML(`<div class="map-popup-title">${escapeHtml(name)}</div>`)
          .addTo(map)
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
```

- [ ] **Step 2: Add cleanup of the new layers/source to `renderMarkersAndGeojson`**

Find this block (around line 199):

```typescript
      for (const layerId of ['property-lines', 'property-polygons']) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource('property-geojson')) map.removeSource('property-geojson')
```

Replace it with:

```typescript
      for (const layerId of [
        'all-boundaries-lines',
        'all-boundaries-polygons',
        'property-lines',
        'property-polygons',
      ]) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource('all-boundaries-geojson')) map.removeSource('all-boundaries-geojson')
      if (map.getSource('property-geojson')) map.removeSource('property-geojson')
```

(The `all-boundaries-*` removals come first so that when the layers are re-added below, the
all-boundaries ones go back in before the property ones — keeping them beneath.)

- [ ] **Step 3: Add the all-boundaries source and layers, before the existing `property-geojson` block**

Find this block (around line 240-243, right after the `for (const project of projects)` loop
closes):

```typescript
      }

      if (features.length > 0) {
        map.addSource('property-geojson', {
```

Replace it with:

```typescript
      }

      if (boundaries.size > 0) {
        map.addSource('all-boundaries-geojson', {
          type: 'geojson',
          data: {type: 'FeatureCollection', features: Array.from(boundaries.values())},
        })

        map.addLayer({
          id: 'all-boundaries-lines',
          type: 'line',
          source: 'all-boundaries-geojson',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {'line-color': '#f59e0b', 'line-width': 1, 'line-dasharray': [2, 2]},
        })

        map.addLayer({
          id: 'all-boundaries-polygons',
          type: 'fill',
          source: 'all-boundaries-geojson',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {'fill-color': '#f59e0b', 'fill-opacity': 0.15},
        })
      }

      if (features.length > 0) {
        map.addSource('property-geojson', {
```

Do not change anything inside the `if (features.length > 0) { ... }` block that follows — the
assigned-project source/layers/hover wiring stay exactly as they are today.

- [ ] **Step 4: Type-check and lint**

```bash
cd frontend && npm run type-check && npm run lint
```

Expected: both pass with no errors. (No schema changed, so `sanity:typegen` is not needed for
this task.)

- [ ] **Step 5: Manual verification in the browser**

No test framework exists in this repo. Tell the user (per this project's standing instruction not
to start preview servers for them) to run `cd frontend && npm run dev` themselves, open `/map`,
and confirm:

- Roughly 517 amber dashed/filled shapes are visible across the island, not just the assigned
  ones.
- Clicking one of the new amber shapes shows a popup with its `track_N` name.
- An already-assigned project (if any exist at the time of testing) still shows its blue
  fill/line, its marker, and hover-highlighting exactly as before this change.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/map/MapboxMap.tsx
git commit -m "$(cat <<'EOF'
feat(map): temporarily render every boundary, not just assigned ones

Aids matching the 517 unnamed LandBankProperties parcels to project
documents by hand - every boundary in the file is now visible on /map,
styled distinctly from assigned ones, with a click popup showing its
track_N name to copy into that project's boundaryId field. Temporary:
remove once every parcel is matched (see the TODO comment in the diff).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
