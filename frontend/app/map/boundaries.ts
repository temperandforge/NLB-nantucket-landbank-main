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
