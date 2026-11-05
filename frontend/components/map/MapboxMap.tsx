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
import {fetchTrailsBounds, type TrailsBounds} from './trailsBounds'
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

/** The arrow_forward icon (same geometry as ArrowForwardIcon), inlined because popups are HTML strings. */
const ARROW_FORWARD_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M16.627 12.75H4.5V11.25H16.627L10.9308 5.55375L12 4.5L19.5 12L12 19.5L10.9308 18.4462L16.627 12.75Z" fill="currentColor"/></svg>'

/** Keep in step with the fade duration in css/popup.css. */
const POPUP_FADE_MS = 150

/** Space kept between an opened popup and the map's edge, in px. */
const POPUP_VIEW_PADDING = 16

/**
 * A popup with no close button that fades out instead of vanishing. It fades in through CSS; this
 * delays the real removal so the fade-out can play. Mapbox calls remove() for click-away, for
 * opening another popup and for toggling a marker's popup, so overriding it covers all of them.
 */
function createPopup(map: mapboxgl.Map, options: mapboxgl.PopupOptions): mapboxgl.Popup {
  const popup = new mapboxgl.Popup({...options, closeButton: false})

  // Mapbox clips a popup at the map's edge and never pans to show it, so a card opened low on
  // the map loses its bottom (the arrow). Nudge the map so the whole card is inside.
  popup.on('open', () => {
    requestAnimationFrame(() => {
      const el = popup.getElement()
      if (!el) return
      const card = el.getBoundingClientRect()
      const view = map.getContainer().getBoundingClientRect()
      const shift = (low: number, high: number, min: number, max: number) =>
        low < min + POPUP_VIEW_PADDING
          ? low - (min + POPUP_VIEW_PADDING)
          : high > max - POPUP_VIEW_PADDING
            ? high - (max - POPUP_VIEW_PADDING)
            : 0
      const dx = shift(card.left, card.right, view.left, view.right)
      const dy = shift(card.top, card.bottom, view.top, view.bottom)
      if (dx || dy) map.panBy([dx, dy], {duration: 300})
    })
  })
  const remove = popup.remove.bind(popup)
  let closing = false
  popup.remove = () => {
    const el = popup.getElement()
    if (closing || !el) return remove()
    closing = true
    el.classList.add('map-popup--closing')
    window.setTimeout(remove, POPUP_FADE_MS)
    return popup
  }
  return popup
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
function buildPopupHtml(project: Property, currentSlug: string | null): string {
  const resources = projectSlugs(project.resources)

  const accessible = resources.includes(RESOURCE_SLUG.handicapAccessible)
    ? '<div class="map-popup--is-accessible">Handicap Accessible</div>'
    : ''

  const image = project.image?.url
    ? // The card is 298x190 CSS px. Without a size, Sanity serves the original upload (a 4000x3000
      // photo is megabytes), and without loading="lazy" the browser fetches it as soon as the
      // markup is parsed, i.e. for every marker's popup on page load, opened or not.
      `<img class="map-popup-image" loading="lazy" decoding="async" src="${encodeURI(
        `${project.image.url}?w=600&h=380&fit=crop&auto=format`,
      )}" alt="${escapeHtml(
        project.image.alt ?? '',
      )}" />`
    : ''

  const desc = project.description
    ? `<p class="map-popup-desc">${escapeHtml(project.description)}</p>`
    : ''

  // The focused property's own popup is not a link: the visitor is already on its page.
  const href =
    project.slug && project.slug !== currentSlug ? encodeURI(propertyHref(project.slug)) : null

  const arrow = href ? `<span class="map-popup-arrow">${ARROW_FORWARD_SVG}</span>` : ''

  const card = `
      ${image}
      <div class="map-popup--content">
        <div class="map-popup--content__inner">
          ${accessible}
          <div class="map-popup--content__headline">
            <p class="map-popup-title">${escapeHtml(project.name)}</p>
            ${desc}
          </div>
        </div>
        ${arrow}
      </div>
    `

  // The whole card is the link, so a click anywhere on it opens the property.
  return href
    ? `<a class="map-popup-card" href="${href}">${card}</a>`
    : `<div class="map-popup-card">${card}</div>`
}

export function MapboxMap({
  projects,
  settings,
  scrollZoom = true,
  focusSlug = null,
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
      // The style is built on Mapbox Standard (imported as `basemap`). Drop the 3D buildings and the
      // POI/transit label layers: they cost GPU and main-thread time and aren't needed here.
      config: {
        basemap: {
          show3dObjects: false,
          showPointOfInterestLabels: false,
          showTransitLabels: false,
        },
      },
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
    let cleanupTrails = () => {}
    if (trailsUrl) {
      // The trails file is the heaviest thing on the page (several MB), and nothing the visitor
      // first sees depends on it, so it is fetched only once the map has drawn its first frame and
      // the main thread is free, rather than competing with the style and tiles at `load`.
      let cancelledTrails = false
      let cancelIdle = () => {}
      let cancelBounds = () => {}
      let trailsObjectUrl: string | null = null
      const revokeTrailsUrl = () => {
        if (trailsObjectUrl) URL.revokeObjectURL(trailsObjectUrl)
        trailsObjectUrl = null
      }
      const loadTrails = async () => {
        try {
          // Zooming to the whole trail network is the default view; a focused property keeps its own.
          // The worker downloads the file once and returns the bounds with the raw file, which the
          // map reads through an object URL: one download, and the page never parses it. A focused
          // property needs no bounds, so the map downloads the file itself.
          let bounds: TrailsBounds | null = null
          let data = trailsUrl
          if (!focusSlug) {
            const request = fetchTrailsBounds(trailsUrl)
            cancelBounds = request.cancel
            const result = await request.promise
            // The map may have been removed while the file downloaded.
            if (cancelledTrails || mapRef.current !== map) return
            if (!result.bounds) return
            bounds = result.bounds
            trailsObjectUrl = URL.createObjectURL(result.blob)
            data = trailsObjectUrl
          }

          map.addSource('gpx-route', {type: 'geojson', data})

          map.addLayer({
            id: 'gpx-route-line',
            type: 'line',
            source: 'gpx-route',
            layout: {'line-join': 'round', 'line-cap': 'round'},
            paint: {'line-color': '#c60024', 'line-width': 1},
          })

          if (bounds) map.fitBounds(bounds, {padding: 40})
        } catch (error) {
          revokeTrailsUrl()
          console.error('Failed to load the trails GeoJSON:', error)
        }
      }

      map.once('load', () => {
        // `idle` is the first moment the map has nothing left to draw; fall back to a timer in case
        // it never reports one.
        const timer = window.setTimeout(() => void loadTrails(), 4000)
        map.once('idle', () => {
          window.clearTimeout(timer)
          if (cancelledTrails) return
          if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(() => void loadTrails(), {timeout: 1000})
            cancelIdle = () => window.cancelIdleCallback(id)
          } else {
            void loadTrails()
          }
        })
        cancelIdle = () => window.clearTimeout(timer)
      })
      cleanupTrails = () => {
        cancelledTrails = true
        cancelIdle()
        cancelBounds()
        // Safe to release now: the map is being removed, so nothing is still reading it.
        revokeTrailsUrl()
      }
    }

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      cleanupTrails()
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
            createPopup(map, {offset: 24}).setHTML(buildPopupHtml(project, focusSlug)),
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

          createPopup(map, {offset: 12})
            .setLngLat(e.lngLat)
            .setHTML(buildPopupHtml(project, focusSlug))
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
  }, [projects, boundaries, focusSlug])

  return <div ref={mapContainerRef} className="h-full w-full" />
}
