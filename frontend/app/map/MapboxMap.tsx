'use client'

import {useEffect, useRef, useState} from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import '../../css/popup.css'

import {loadBoundaryIndex, type BoundaryIndex} from './boundaries'
import {
  DEFAULT_ZOOM,
  NANTUCKET_CENTER,
  projectSlugs,
  RESOURCE_SLUG,
  toLngLat,
  type MapSettings,
  type Project,
} from './types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface MapboxMapProps {
  projects: Project[]
  settings: MapSettings | null
}

/** Popup content is injected as HTML, so any authored value must be escaped first. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build the popup markup for a project. Styled by css/popup.css.
 *
 * Every interpolated value is escaped: these come from the CMS, and setHTML would otherwise let
 * a stray angle bracket in a description break the markup.
 */
function buildPopupHtml(project: Project): string {
  const resources = projectSlugs(project.resources)

  const accessible = resources.includes(RESOURCE_SLUG.handicapAccessible)
    ? '<div class="map-popup--is-accessible">Handicap Accessible</div>'
    : ''

  const parking = resources.includes(RESOURCE_SLUG.parking)
    ? '<div class="map-popup--is-parking">Parking Availability</div>'
    : ''

  const image = project.image?.url
    ? `<img class="map-popup-image" src="${encodeURI(project.image.url)}" alt="${escapeHtml(
        project.image.alt ?? '',
      )}" />`
    : ''

  const desc = project.description
    ? `<p class="map-popup-desc">${escapeHtml(project.description)}</p>`
    : ''

  const link = project.link
    ? `<a class="map-popup-link" href="${encodeURI(project.link)}">Find out more</a>`
    : ''

  return `
      ${accessible}
      ${image}
      <div class="map-popup--content">
        <div class="map-popup--content__inner">
          <div class="map-popup--content__headline">
            <p class="map-popup-title">${escapeHtml(project.name)}</p>
            ${desc}
          </div>
          ${parking}
        </div>
        ${link}
      </div>
    `
}

export function MapboxMap({projects, settings}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const projectByFeatureIdRef = useRef<Map<number, Project>>(new Map())

  // Boundaries come from one file shared by every project, so they are fetched once and indexed
  // rather than re-read whenever the filters change.
  const [boundaries, setBoundaries] = useState<BoundaryIndex>(() => new Map())

  const boundaryUrl = settings?.boundaryDataUrl ?? null
  const idProperty = settings?.boundaryIdProperty ?? 'id'
  const trailsUrl = settings?.trailsDataUrl ?? null

  useEffect(() => {
    let cancelled = false
    loadBoundaryIndex(boundaryUrl, idProperty).then((index) => {
      if (!cancelled) setBoundaries(index)
    })
    return () => {
      cancelled = true
    }
  }, [boundaryUrl, idProperty])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const center = toLngLat(settings?.defaultCenter) ?? NANTUCKET_CENTER

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/tfdev/cmrmj301k000p01rdcrzp6qxr',
      center,
      zoom: settings?.defaultZoom ?? DEFAULT_ZOOM,
    })
    mapRef.current = map

    /**
     * Trails track, uploaded on Project Settings. Separate from the property boundaries: nothing
     * points into this file, so every line in it is drawn.
     *
     * Guarded rather than returned early - the control and the cleanup below must still run when no
     * trails file is uploaded.
     */
    if (trailsUrl) {
      map.on('load', async () => {
        try {
          const response = await fetch(trailsUrl)
          if (!response.ok) {
            console.error(`Could not download the trails GeoJSON (${response.status}).`)
            return
          }
          const geojsonData = await response.json()
          const features: GeoJSON.Feature[] = Array.isArray(geojsonData?.features)
            ? geojsonData.features
            : []
          if (!features.length) return

          features.forEach((feature, index) => {
            feature.id = index
          })

          map.addSource('gpx-route', {type: 'geojson', data: geojsonData})

          map.addLayer({
            id: 'gpx-route-line',
            type: 'line',
            source: 'gpx-route',
            layout: {'line-join': 'round', 'line-cap': 'round'},
            paint: {'line-color': '#c60024', 'line-width': 1},
          })

          const coordinates = features.flatMap((feature) => {
            if (feature.geometry.type === 'LineString') return feature.geometry.coordinates
            if (feature.geometry.type === 'MultiLineString')
              return feature.geometry.coordinates.flat()
            return []
          })

          if (coordinates.length > 0) {
            const bounds = coordinates.reduce(
              (acc: mapboxgl.LngLatBounds, coord) => acc.extend(coord as [number, number]),
              new mapboxgl.LngLatBounds(
                coordinates[0] as [number, number],
                coordinates[0] as [number, number],
              ),
            )
            map.fitBounds(bounds, {padding: 40})
          }
        } catch (error) {
          console.error('Failed to load the trails GeoJSON:', error)
        }
      })
    }

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
      map.remove()
      mapRef.current = null
    }
    // Deliberately mount-only: re-running would tear down and rebuild the map, losing the
    // visitor's pan and zoom every time a filter changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    function renderMarkersAndGeojson() {
      if (!map) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      projectByFeatureIdRef.current = new Map()

      // TODO(all-boundaries): remove with the temporary all-boundaries layers
      for (const layerId of [
        'all-boundaries-lines',
        'all-boundaries-polygons',
        'property-lines',
        'property-polygons',
      ]) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      // TODO(all-boundaries): remove with the temporary all-boundaries layers
      if (map.getSource('all-boundaries-geojson')) map.removeSource('all-boundaries-geojson')
      if (map.getSource('property-geojson')) map.removeSource('property-geojson')

      /**
       * Markers and boundary features are built in one pass so a project's marker and its polygon
       * share the same numeric feature id. Keying them off two separate indexes - one over all
       * projects, one over only those with geometry - makes hovering highlight the wrong polygon as
       * soon as a single project has no boundary assigned.
       */
      const features: GeoJSON.Feature[] = []
      const markerEntries: {featureId: number; marker: mapboxgl.Marker}[] = []
      const assignedBoundaryIds = new Set<string>()

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

      if (boundaries.size > 0) {
        // TODO(all-boundaries): remove with the temporary all-boundaries layers
        map.addSource('all-boundaries-geojson', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: Array.from(boundaries)
              .filter(([id]) => !assignedBoundaryIds.has(id))
              .map(([id, feature]) => ({
                ...feature,
                properties: {...feature.properties, boundaryIdValue: id},
              })),
          },
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
          type: 'geojson',
          data: {type: 'FeatureCollection', features},
        })

        map.addLayer({
          id: 'property-lines',
          type: 'line',
          source: 'property-geojson',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {'line-color': '#2563eb', 'line-width': 3},
        })

        map.addLayer({
          id: 'property-polygons',
          type: 'fill',
          source: 'property-geojson',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.4, // hover
              0.2, // default
            ],
            'fill-opacity-transition': {duration: 300},
          },
        })
      }

      // Hover wiring runs after the source exists - setFeatureState throws on an unknown source.
      let hoveredStateId: number | undefined = undefined

      for (const {featureId, marker} of markerEntries) {
        const markerDiv = marker.getElement()

        markerDiv.addEventListener('mouseenter', () => {
          if (hoveredStateId !== undefined) {
            map.setFeatureState({source: 'property-geojson', id: hoveredStateId}, {hover: false})
          }
          hoveredStateId = featureId
          map.setFeatureState({source: 'property-geojson', id: featureId}, {hover: true})

          markerDiv.style.transition = 'top .2s ease'
          markerDiv.style.top = '-6px'
          markerDiv.style.cursor = 'pointer'
        })

        markerDiv.addEventListener('mouseleave', () => {
          if (hoveredStateId !== undefined) {
            map.setFeatureState({source: 'property-geojson', id: hoveredStateId}, {hover: false})
            hoveredStateId = undefined
          }
          markerDiv.style.top = '0'
          markerDiv.style.cursor = 'auto'
        })
      }
    }

    if (map.isStyleLoaded()) {
      renderMarkersAndGeojson()
      return
    }

    // Waiting on the style. The listener is removed on cleanup: this effect re-runs whenever the
    // filters change or the boundaries arrive, and without this each run would leave another
    // handler behind, all of which would fire together once the style loaded.
    map.once('load', renderMarkersAndGeojson)
    return () => {
      map.off('load', renderMarkersAndGeojson)
    }
  }, [projects, boundaries])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
