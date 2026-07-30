'use client'

import {useEffect, useRef, useState} from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import {geometryCenter, loadBoundaryIndex, type BoundaryIndex} from './boundaries'
import {
  DEFAULT_ZOOM,
  NANTUCKET_CENTER,
  toLngLat,
  type MapSettings,
  type Project,
} from './types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface MapboxMapProps {
  projects: Project[]
  settings: MapSettings | null
}

export function MapboxMap({projects, settings}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Boundaries come from one file shared by every project, so they are fetched once and indexed
  // rather than re-read whenever the filters change.
  const [boundaries, setBoundaries] = useState<BoundaryIndex>(() => new Map())

  const boundaryUrl = settings?.boundaryDataUrl ?? null
  const idProperty = settings?.boundaryIdProperty ?? 'id'

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

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom: settings?.defaultZoom ?? DEFAULT_ZOOM,
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      mapRef.current?.remove()
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

      for (const layerId of ['property-lines', 'property-polygons']) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource('property-geojson')) map.removeSource('property-geojson')

      const features: GeoJSON.Feature[] = []

      for (const project of projects) {
        const boundary = project.boundaryId ? boundaries.get(project.boundaryId) : undefined

        if (boundary?.geometry) {
          features.push({
            type: 'Feature',
            properties: {id: project.boundaryId, name: project.name},
            geometry: boundary.geometry,
          })
        }

        // An explicit marker position wins; otherwise fall back to the middle of the boundary. A
        // project with neither gets no marker at all, rather than one at a made-up coordinate.
        const position =
          toLngLat(project.location) ??
          (boundary?.geometry ? geometryCenter(boundary.geometry) : null)

        if (!position) continue

        const typeLabels = (project.propertyTypes ?? [])
          .filter((entry) => Boolean(entry?.title))
          .map((entry) => entry.title)
          .join(', ')

        const popup = new mapboxgl.Popup({offset: 24}).setHTML(
          `<strong>${escapeHtml(project.name)}</strong>${
            typeLabels ? `<br/>${escapeHtml(typeLabels)}` : ''
          }`,
        )

        const marker = new mapboxgl.Marker()
          .setLngLat(position)
          .setPopup(popup)
          .addTo(map)
        markersRef.current.push(marker)
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
          paint: {'fill-color': '#2563eb', 'fill-opacity': 0.2},
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

/** Popup content is set as HTML, so project names must not be able to inject markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
