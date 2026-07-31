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
  const features = dedupeFeatureNames(
    converted.features.filter((feature) => feature.geometry.type !== 'Point').map(closeIfLoop),
  )

  if (features.length === 0) {
    throw new Error('No tracks or routes found in this GPX file.')
  }

  return {type: 'FeatureCollection', features}
}

/**
 * Replaces any feature's name that is blank or a duplicate of an earlier feature's name with
 * `track_<position>` (1-based). Real client GPX data has been found to carry a literal blank
 * `<name> </name>` on every track, which otherwise collides on the boundary-picker's dedup key.
 */
function dedupeFeatureNames(features: GeoJSON.Feature[]): GeoJSON.Feature[] {
  const seen = new Set<string>()

  return features.map((feature, i) => {
    const rawName = feature.properties?.name
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : ''
    const isBlank = trimmedName === ''
    const isDuplicate = !isBlank && seen.has(trimmedName)

    if (!isBlank) seen.add(trimmedName)

    if (!isBlank && !isDuplicate) return feature

    return {...feature, properties: {...feature.properties, name: `track_${i + 1}`}}
  })
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
