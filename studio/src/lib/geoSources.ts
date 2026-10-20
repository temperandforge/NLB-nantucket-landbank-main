/**
 * Reads an uploaded file into raw GeoJSON, before normalisation. Each format's source step also
 * decides which properties survive: GPX keeps only a non-blank `name`.
 */

import {gpx, kml} from '@tmcw/togeojson'
import {unzipSync} from 'fflate'

import {GeoConversionError, type GeoFormat, type ParseXml} from './geoReport'

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] // "PK\x03\x04"

// A Map, not an object literal: `x.constructor` / `x.toString` must not resolve to inherited members.
const EXTENSIONS = new Map<string, GeoFormat>([
  ['gpx', 'gpx'],
  ['kml', 'kml'],
  ['kmz', 'kmz'],
  ['geojson', 'geojson'],
  ['json', 'geojson'],
])

/** By extension (case-insensitive); a zip signature makes a `.kml`-named upload a KMZ. */
export function detectFormat(filename: string, bytes: Uint8Array): GeoFormat {
  // A name with no dot has no extension; split().pop() would return the whole name.
  const dot = filename.lastIndexOf('.')
  const extension = dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
  const format = EXTENSIONS.get(extension)
  if (!format) {
    throw new GeoConversionError(
      `Unsupported file type ${extension ? `".${extension}"` : '(no extension)'}. Use .gpx, .kml, .kmz, .geojson or .json.`,
    )
  }
  const isZip = ZIP_MAGIC.every((b, i) => bytes[i] === b)
  return format === 'kml' && isZip ? 'kmz' : format
}

const decode = (bytes: Uint8Array) => new TextDecoder('utf-8').decode(bytes)

function parseDocument(xml: string, parseXml: ParseXml): Document {
  let doc: Document
  try {
    doc = parseXml(xml, 'text/xml')
  } catch {
    // xmldom throws on fatal errors.
    throw new GeoConversionError('The file is not valid XML.')
  }
  // Browsers report a parse failure as a <parsererror> document rather than throwing.
  if (doc.getElementsByTagName('parsererror').length) {
    throw new GeoConversionError('The file is not valid XML.')
  }
  return doc
}

function toCollection(value: unknown): GeoJSON.FeatureCollection {
  const json = value as {type?: string}
  switch (json?.type) {
    case 'FeatureCollection':
      if (!Array.isArray((json as {features?: unknown}).features)) {
        throw new GeoConversionError('The GeoJSON FeatureCollection has no "features" array.')
      }
      return json as GeoJSON.FeatureCollection
    case 'Feature':
      return {type: 'FeatureCollection', features: [json as GeoJSON.Feature]}
    case 'Polygon':
    case 'MultiPolygon':
    case 'LineString':
    case 'MultiLineString':
    case 'Point':
    case 'MultiPoint':
    case 'GeometryCollection':
      return {
        type: 'FeatureCollection',
        features: [{type: 'Feature', properties: {}, geometry: json as GeoJSON.Geometry}],
      }
    default:
      throw new GeoConversionError('The file is not GeoJSON.')
  }
}

/**
 * Esri's KML export puts the attribute table in each Placemark's `description` as nested HTML
 * tables. Returns trimmed key -> value for rows of exactly two cells, skipping blanks. Only the
 * innermost rows count, so a table wrapped in a layout row does not yield a merged entry.
 */
export function parseAttributeTable(html: string, parseXml: ParseXml): Record<string, string> {
  const doc = parseXml(html, 'text/html')
  const out: Record<string, string> = {}
  for (const row of Array.from(doc.getElementsByTagName('tr'))) {
    if (row.getElementsByTagName('tr').length) continue // wraps another table
    const cells = Array.from(row.childNodes).filter(
      (n): n is Element => n.nodeType === 1 && /^t[dh]$/i.test((n as Element).nodeName),
    )
    if (cells.length !== 2) continue
    const key = cells[0].textContent?.trim() ?? ''
    const value = cells[1].textContent?.trim() ?? ''
    if (key && value) out[key] = value
  }
  return out
}

/** The KML inside a KMZ: `doc.kml` if present at any depth, otherwise the first `.kml`. */
function unzipKml(bytes: Uint8Array): Uint8Array {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new GeoConversionError('The file is not a valid KMZ (zip) archive.')
  }
  const names = Object.keys(files).filter((n) => n.toLowerCase().endsWith('.kml'))
  const name = names.find((n) => n.toLowerCase().split('/').pop() === 'doc.kml') ?? names[0]
  if (!name) throw new GeoConversionError('The KMZ contains no .kml file.')
  return files[name]
}

function kmlToCollection(xml: string, parseXml: ParseXml): GeoJSON.FeatureCollection {
  const doc = parseDocument(xml, parseXml)
  // togeojson types a null geometry as legal; normalisation counts those.
  let raw: GeoJSON.FeatureCollection<GeoJSON.Geometry | null>
  try {
    raw = kml(doc)
  } catch {
    throw new GeoConversionError('The file is not valid KML.')
  }
  return {
    type: 'FeatureCollection',
    features: raw.features.map((feature) => {
      const props = feature.properties ?? {}
      // togeojson gives the description as a string, or as {'@type': 'html', value} for HTML.
      const description = props.description as unknown
      const html =
        typeof description === 'string'
          ? description
          : String((description as {value?: unknown} | null)?.value ?? '')
      const properties: Record<string, string> = html ? parseAttributeTable(html, parseXml) : {}
      const name = props.name
      if (typeof name === 'string' && name.trim() !== '') properties.name = name
      return {...feature, properties}
    }) as GeoJSON.Feature[],
  }
}

export function readSource(
  format: GeoFormat,
  bytes: Uint8Array,
  parseXml: ParseXml,
): GeoJSON.FeatureCollection {
  switch (format) {
    case 'gpx': {
      const doc = parseDocument(decode(bytes), parseXml)
      let raw: GeoJSON.FeatureCollection
      try {
        raw = gpx(doc)
      } catch {
        throw new GeoConversionError('The file is not valid GPX.')
      }
      return {
        type: 'FeatureCollection',
        features: raw.features.map((feature) => {
          const name = feature.properties?.name
          const keep = typeof name === 'string' && name.trim() !== ''
          return {...feature, properties: keep ? {name} : {}}
        }),
      }
    }
    case 'geojson':
      try {
        return toCollection(JSON.parse(decode(bytes)))
      } catch (error) {
        if (error instanceof GeoConversionError) throw error
        throw new GeoConversionError('The file is not valid JSON.')
      }
    case 'kmz':
      return kmlToCollection(decode(unzipKml(bytes)), parseXml)
    case 'kml':
      return kmlToCollection(decode(bytes), parseXml)
  }
}
