'use client'

import {useEffect, useRef, useState} from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import '../../css/popup.css'

import {propertyHref} from '@/sanity/lib/utils'

import {
  geometryBounds,
  geometryCenterOfMany,
  loadBoundaryIndex,
  type BoundaryIndex,
} from './boundaries'
import {
  DEFAULT_ZOOM,
  NANTUCKET_CENTER,
  PROPERTY_TYPE_SLUG,
  projectSlugs,
  RESOURCE_SLUG,
  toLngLat,
  type MapSettings,
  type Property,
} from './types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

/** Property boundary colour. Mapbox paint can't read CSS variables, so this mirrors `--color-brand` in css/globals.css. */
const BOUNDARY_COLOR = '#ff5500'

interface MapboxMapProps {
  projects: Property[]
  settings: MapSettings | null
  /** Off for an embedded preview, where wheel-zooming would hijack the page scroll. */
  scrollZoom?: boolean
  /**
   * Slug of one property to zoom to, for a property's own page. Every property is still drawn; the
   * view just opens on this one's boundaries (or its marker when it has none) instead of the whole
   * island or trail network.
   */
  focusSlug?: string | null
  /** Off to leave the "Find out more" link out of every popup, e.g. on a property's own page. */
  showPopupLink?: boolean
}

/** Closest a focused property is allowed to zoom, so a tiny parcel doesn't fill the map with one block. */
const FOCUS_MAX_ZOOM = 16.5
/** How far out from a tight fit a focused property opens, in zoom levels, so it sits in some context. */
const FOCUS_ZOOM_OUT = 1
/**
 * Parcel fill opacity on a focused map: the current property is shown strongly (and outlined) while
 * its neighbours recede, so it is clear which parcels belong to the page you are on. Hover brightens
 * either one from its own resting level. Without a focus, every parcel uses 0.2 resting, 0.4 hovered.
 */
const FOCUSED_FILL = 0.4
const FOCUSED_FILL_HOVER = 0.55
const NEIGHBOUR_FILL = 0.15
const NEIGHBOUR_FILL_HOVER = 0.3
/** Width of the outline drawn round the focused property's parcels. */
const FOCUSED_OUTLINE_WIDTH = 2
/** Zoom for a focused property that has a marker but no boundary. */
const FOCUS_MARKER_ZOOM = 15

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
function buildPopupHtml(project: Property, showLink: boolean): string {
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

  const link =
    showLink && project.slug
      ? `<a class="map-popup-link" href="${encodeURI(propertyHref(project.slug))}">Find out more</a>`
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

export function MapboxMap({
  projects,
  settings,
  scrollZoom = true,
  focusSlug = null,
  showPopupLink = true,
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  // The focused property is fitted once, when its boundaries are available, and then left alone so
  // a later filter or data change doesn't snatch the view back from a visitor who has panned away.
  const focusedRef = useRef(false)
  // map.on(type, layerId, listener) listeners outlive the layer they were bound to - removing and
  // re-adding 'property-polygons' on every render does not unregister them. Tracked here so each
  // render's listeners are unbound before the next render's are added, instead of stacking.
  const polygonListenersRef = useRef<
    {
      type: 'mousemove' | 'mouseleave' | 'click'
      listener: (e: mapboxgl.MapLayerMouseEvent) => void
    }[]
  >([])

  // Boundaries come from one file shared by every project, so they are fetched once and indexed
  // rather than re-read whenever the filters change.
  const [boundaries, setBoundaries] = useState<BoundaryIndex>(() => new Map())

  const boundaryUrl = settings?.boundaryDataUrl ?? null
  const idProperty = settings?.boundaryIdProperty ?? 'FID'
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
    if (!scrollZoom) map.scrollZoom.disable()

    /**
     * Trails track, uploaded on Properties Settings. Separate from the property boundaries: nothing
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

          // Zooming to the whole trail network is the default view; a focused property keeps its own.
          if (coordinates.length > 0 && !focusSlug) {
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

      // map.on(type, layer, listener) is independent of the layer's lifecycle, so removing
      // 'property-polygons' below does not unbind these - they must be unbound explicitly or
      // every render adds another copy on top of the last.
      for (const {type, listener} of polygonListenersRef.current) {
        map.off(type, 'property-polygons', listener)
      }
      polygonListenersRef.current = []

      for (const layerId of ['property-lines', 'property-outlines', 'property-polygons']) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource('property-geojson')) map.removeSource('property-geojson')

      /**
       * Boundary features are built first so every project with geometry can be looked up by
       * feature id when the polygon layer is clicked or hovered. A project with geometry normally
       * gets no marker - the popup opens by clicking its polygon instead - except a beach property,
       * which gets both. Only a project with neither a boundary nor a location is dropped from the
       * map entirely.
       */
      const features: GeoJSON.Feature[] = []
      const featureIdToProject = new Map<number, Property>()
      // Every id in a project's own parcel group maps back to that same group array, so hovering
      // any one of a multi-parcel project's polygons highlights all of them together.
      const featureIdToGroupIds = new Map<number, number[]>()

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
            // `focused` drives the highlight on a property's own page; false everywhere else.
            properties: {
              name: project.name,
              focused: Boolean(focusSlug) && project.slug === focusSlug,
            },
            geometry: boundary.geometry,
          })
          featureIds.push(featureId)
          featureIdToProject.set(featureId, project)
        }
        for (const featureId of featureIds) {
          featureIdToGroupIds.set(featureId, featureIds)
        }

        // On a property's own page, open on that property. Done here, before the `continue`s below,
        // because a property with boundaries never reaches the marker code. A property whose
        // boundaries are still loading is waited for (the effect re-runs when they arrive) rather
        // than fitted to its marker and then never corrected.
        if (focusSlug && !focusedRef.current && project.slug === focusSlug) {
          const bounds = geometryBounds(projectBoundaries.map((boundary) => boundary.geometry))
          if (bounds) {
            // The tight fit, then one level back out. cameraForBounds gives the fit without moving
            // the map, so the zoom-out is applied in the same single jump.
            const camera = map.cameraForBounds(bounds, {padding: 40, maxZoom: FOCUS_MAX_ZOOM})
            if (camera?.center) {
              map.jumpTo({
                center: camera.center,
                zoom: (camera.zoom ?? DEFAULT_ZOOM) - FOCUS_ZOOM_OUT,
              })
              focusedRef.current = true
            }
          } else if (!project.boundaryIds?.length || boundaries.size > 0) {
            const centre = toLngLat(project.location)
            if (centre) map.jumpTo({center: centre, zoom: FOCUS_MARKER_ZOOM})
            focusedRef.current = true
          }
        }

        // A project with a boundary is otherwise clicked on its polygon, not a marker - except a
        // beach property, which keeps a marker even though it also has a boundary, since a beach's
        // access point is what a visitor is actually looking for. Only a project with neither a
        // boundary nor a location is skipped - never one placed at a made-up coordinate.
        const isBeach = projectSlugs(project.propertyTypes).includes(PROPERTY_TYPE_SLUG.beach)
        if (featureIds.length && !isBeach) continue

        const position =
          toLngLat(project.location) ??
          (projectBoundaries.length
            ? geometryCenterOfMany(projectBoundaries.map((boundary) => boundary.geometry))
            : null)
        if (!position) continue

        const marker = new mapboxgl.Marker().setLngLat(position).addTo(map)
        if (!project.disablePopup) {
          marker.setPopup(
            new mapboxgl.Popup({offset: 24}).setHTML(buildPopupHtml(project, showPopupLink)),
          )
        }
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
          paint: {'line-color': BOUNDARY_COLOR, 'line-width': 3},
        })

        map.addLayer({
          id: 'property-polygons',
          type: 'fill',
          source: 'property-geojson',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': BOUNDARY_COLOR,
            'fill-opacity': focusSlug
              ? [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  ['case', ['get', 'focused'], FOCUSED_FILL_HOVER, NEIGHBOUR_FILL_HOVER],
                  ['case', ['get', 'focused'], FOCUSED_FILL, NEIGHBOUR_FILL],
                ]
              : [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  0.4, // hover
                  0.2, // default
                ],
            'fill-opacity-transition': {duration: 300},
          },
        })

        // The outline marks the focused property's parcels only. Added after the fill so it sits on
        // top, and it is not interactive - clicks and hover stay on the fill layer.
        if (focusSlug) {
          map.addLayer({
            id: 'property-outlines',
            type: 'line',
            source: 'property-geojson',
            filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'focused'], true]],
            layout: {'line-join': 'round'},
            paint: {'line-color': BOUNDARY_COLOR, 'line-width': FOCUSED_OUTLINE_WIDTH},
          })
        }
      }

      if (features.length > 0) {
        // Hover highlights every parcel of the moused-over project together, and click opens its
        // popup at the click point - a project with a boundary has no marker, so this layer is
        // its only interactive surface. Wiring runs after the source exists - setFeatureState
        // throws on an unknown source.
        let hoveredFeatureIds: number[] = []

        const onMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
          const feature = e.features?.[0]
          if (feature?.id === undefined) return

          // A popup-disabled project doesn't respond to a click, so the hover highlight and
          // pointer cursor - both signals of "this is clickable" - are suppressed too.
          if (featureIdToProject.get(feature.id as number)?.disablePopup) {
            onMouseLeave()
            return
          }

          const groupIds = featureIdToGroupIds.get(feature.id as number) ?? []
          // Comparing by reference against the group array already set: every id in one project's
          // group points at the same array, so this is false while the cursor stays within one
          // project's parcels, and only clears/resets state when it crosses into another's.
          if (groupIds !== hoveredFeatureIds) {
            for (const id of hoveredFeatureIds) {
              map.setFeatureState({source: 'property-geojson', id}, {hover: false})
            }
            hoveredFeatureIds = groupIds
            for (const id of groupIds) {
              map.setFeatureState({source: 'property-geojson', id}, {hover: true})
            }
          }
          map.getCanvas().style.cursor = 'pointer'
        }

        const onMouseLeave = () => {
          for (const id of hoveredFeatureIds) {
            map.setFeatureState({source: 'property-geojson', id}, {hover: false})
          }
          hoveredFeatureIds = []
          map.getCanvas().style.cursor = ''
        }

        const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
          // A Marker's own popup opens by listening for the map's 'click' event and checking
          // whether the original DOM target was its element - it does not stop propagation, so a
          // click that lands on a marker sitting over a polygon reaches this handler too, keyed
          // by the same pixel. Skipping here when the click actually landed on a marker avoids
          // opening this polygon's popup on top of that marker's own.
          const target = e.originalEvent.target
          if (target instanceof Element && target.closest('.mapboxgl-marker')) return

          const feature = e.features?.[0]
          if (feature?.id === undefined) return
          const project = featureIdToProject.get(feature.id as number)
          if (!project || project.disablePopup) return

          new mapboxgl.Popup({offset: 12})
            .setLngLat(e.lngLat)
            .setHTML(buildPopupHtml(project, showPopupLink))
            .addTo(map)
        }

        map.on('mousemove', 'property-polygons', onMouseMove)
        map.on('mouseleave', 'property-polygons', onMouseLeave)
        map.on('click', 'property-polygons', onClick)
        polygonListenersRef.current = [
          {type: 'mousemove', listener: onMouseMove},
          {type: 'mouseleave', listener: onMouseLeave},
          {type: 'click', listener: onClick},
        ]
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
  }, [projects, boundaries, focusSlug, showPopupLink])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
