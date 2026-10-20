/**
 * Reads an uploaded file into raw GeoJSON, before normalisation. Each format's source step also
 * decides which properties survive: GPX keeps only a non-blank `name`.
 */

import {gpx} from '@tmcw/togeojson'

import {GeoConversionError, type ParseXml} from './geoConversion'
import type {GeoFormat} from './geoReport'

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] // "PK\x03\x04"

const EXTENSIONS: Record<string, GeoFormat> = {
  gpx: 'gpx',
  kml: 'kml',
  kmz: 'kmz',
  geojson: 'geojson',
  json: 'geojson',
}

/** By extension (case-insensitive); a zip signature makes a `.kml`-named upload a KMZ. */
export function detectFormat(filename: string, bytes: Uint8Array): GeoFormat {
  const extension = filename.toLowerCase().split('.').pop() ?? ''
  const format = EXTENSIONS[extension]
  if (!format) {
    throw new GeoConversionError(
      `Unsupported file type ".${extension}". Use .gpx, .kml, .kmz, .geojson or .json.`,
    )
  }
  const isZip = ZIP_MAGIC.every((b, i) => bytes[i] === b)
  return format === 'kml' && isZip ? 'kmz' : format
}

const decode = (bytes: Uint8Array) => new TextDecoder('utf-8').decode(bytes)

function parseDocument(xml: string, parseXml: ParseXml): Document {
  const doc = parseXml(xml, 'text/xml')
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

export function readSource(
  format: GeoFormat,
  bytes: Uint8Array,
  parseXml: ParseXml,
): GeoJSON.FeatureCollection {
  switch (format) {
    case 'gpx': {
      const raw = gpx(parseDocument(decode(bytes), parseXml))
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
    default:
      throw new GeoConversionError(`${format.toUpperCase()} files are not supported yet.`)
  }
}
