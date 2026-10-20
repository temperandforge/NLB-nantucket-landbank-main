/**
 * Converts an uploaded GPX / KML / KMZ / GeoJSON file into the GeoJSON the map reads.
 *
 * Pure: bytes in, `{geojson, report}` out. The XML parser is injected (`DOMParser` in the browser,
 * `@xmldom/xmldom` in scripts/verifyGeoConversion.ts) so the same code runs in both. Failures
 * throw `GeoConversionError` rather than returning partial output.
 */

import {normalizeCollection} from './geoNormalize'
import type {ConversionReport, GeoLayer} from './geoReport'
import {detectFormat, readSource} from './geoSources'

export type ParseXml = (xml: string, mime: 'text/xml' | 'text/html') => Document

export type ConvertInput = {
  bytes: Uint8Array
  filename: string
  layer: GeoLayer
  /** Boundary identifier property to check (boundaries only). */
  idProperty?: string
  parseXml: ParseXml
}

export type ConversionResult = {geojson: GeoJSON.FeatureCollection; report: ConversionReport}

export class GeoConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeoConversionError'
  }
}

const KIND: Record<GeoLayer, string> = {boundaries: 'polygon', trails: 'line'}

export function convertGeoFile(input: ConvertInput): ConversionResult {
  const {bytes, filename, layer, parseXml} = input
  const format = detectFormat(filename, bytes)
  const raw = readSource(format, bytes, parseXml)
  const {features, merged, dropped} = normalizeCollection(raw, layer)

  if (!features.length) {
    throw new GeoConversionError(
      `The file has no usable ${KIND[layer]} geometry for the ${layer} map.`,
    )
  }

  const geojson: GeoJSON.FeatureCollection = {type: 'FeatureCollection', features}
  return {
    geojson,
    report: {
      format,
      featuresKept: features.length,
      geometriesMerged: merged,
      dropped,
      idProperty: null, // checked for boundaries once the KML attribute table is parsed
      bytesIn: bytes.length,
      bytesOut: JSON.stringify(geojson).length,
    },
  }
}
