/**
 * Types (and the error class) shared by the geo conversion modules and the Studio input. Kept
 * apart from geoConversion.ts so geoSources.ts does not import from the module that imports it.
 */

/** Injected XML parser: `DOMParser` in the browser, `@xmldom/xmldom` in scripts. */
export type ParseXml = (xml: string, mime: 'text/xml' | 'text/html') => Document

/** Any failure to convert a file; the message is shown to the editor. */
export class GeoConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeoConversionError'
  }
}

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
