/**
 * Reading the single boundary-data file.
 *
 * The client maintains one GeoJSON FeatureCollection covering every property boundary, uploaded on
 * Project Settings. A project points at one feature in it by identifier, and which feature property
 * holds that identifier is configurable, because it depends on how the client's file is structured.
 */

export type BoundaryIndex = Map<string, GeoJSON.Feature>

/**
 * Fetch and index the boundary file by identifier.
 *
 * Returns an empty index rather than throwing: the map is still useful with markers and no
 * outlines, and a missing or malformed file must not blank the page.
 */
export async function loadBoundaryIndex(
  url: string | null | undefined,
  idProperty: string,
): Promise<BoundaryIndex> {
  const index: BoundaryIndex = new Map()
  if (!url) return index

  try {
    const response = await fetch(url)
    if (!response.ok) return index
    const geojson = await response.json()
    const features: unknown[] = Array.isArray(geojson?.features) ? geojson.features : []

    for (const feature of features) {
      const typed = feature as GeoJSON.Feature
      const rawId = typed?.properties?.[idProperty]
      if (rawId === undefined || rawId === null || rawId === '') continue
      const id = String(rawId)
      // First one wins on a duplicate id - picking arbitrarily between two boundaries would make
      // the rendered map depend on file ordering.
      if (!index.has(id)) index.set(id, typed)
    }
  } catch {
    // Fall through to the empty index.
  }

  return index
}

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

function collectPositions(geometry: GeoJSON.Geometry): [number, number][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as [number, number]]
    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates as [number, number][]
    case 'Polygon':
      // Outer ring only; holes would drag the average toward gaps in the shape.
      return (geometry.coordinates[0] ?? []) as [number, number][]
    case 'MultiLineString':
      return geometry.coordinates.flat() as [number, number][]
    case 'MultiPolygon':
      return geometry.coordinates.map((polygon) => polygon[0] ?? []).flat() as [number, number][]
    case 'GeometryCollection':
      return geometry.geometries.flatMap(collectPositions)
    default:
      return []
  }
}
