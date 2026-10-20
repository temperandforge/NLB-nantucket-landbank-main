/**
 * Types describing what a geo-file conversion did, shown to the editor before anything is written.
 * Pure types, shared by the conversion modules and the Studio input.
 */

/** The two map files on Properties Settings; each keeps only the geometry its layer draws. */
export type GeoLayer = 'boundaries' | 'trails'

export type GeoFormat = 'gpx' | 'kml' | 'kmz' | 'geojson'

export type IdPropertyReport = {
  /** The configured boundary identifier property that was checked. */
  name: string
  status: 'found' | 'missing' | 'duplicated'
  /** Features that lack the property. */
  missingCount: number
  duplicateValues: string[]
  /** Property names present in the file, so the editor can pick another when `name` is absent. */
  available: string[]
}

export type ConversionReport = {
  format: GeoFormat
  featuresKept: number
  /** GeometryCollections flattened into a single Multi* geometry. */
  geometriesMerged: number
  /** Geometry type -> how many were dropped because the layer does not draw them. */
  dropped: Record<string, number>
  /** Null for trails, which have no identifier. */
  idProperty: IdPropertyReport | null
  bytesIn: number
  bytesOut: number
}
