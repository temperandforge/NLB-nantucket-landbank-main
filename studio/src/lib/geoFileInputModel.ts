/**
 * Pure helpers for the map file upload input (src/components/GeoFileInput.tsx): field names,
 * the patches it writes, and how a conversion report or error reads to the editor. Kept out of the
 * component so scripts/verifyGeoConversion.ts can check them without a browser.
 */

import {GeoConversionError, WRAPPED_ERROR_PREFIX} from './geoConversion'
import type {ConversionReport, GeoLayer} from './geoReport'

/**
 * Largest original file the input accepts. Conversion runs synchronously on the main thread
 * (the client's 10 MB GPX takes ~1.4 s), so a much larger file would freeze Studio.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024

/** The upload field and the generated field it writes, per layer. */
export const SOURCE_FIELD = {boundaries: 'boundarySource', trails: 'trailsSource'} as const
export const GENERATED_FIELD = {boundaries: 'boundaryData', trails: 'trailsData'} as const

/** `parcels.kmz` -> `parcels.geojson`; a name with no extension keeps its whole name. */
export function generatedFilename(original: string): string {
  const dot = original.lastIndexOf('.')
  const base = dot > 0 ? original.slice(0, dot) : original
  return `${base || 'converted'}.geojson`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Null when the file is small enough to convert, otherwise the message to show. */
export function checkSourceSize(bytes: number): string | null {
  if (bytes <= MAX_SOURCE_BYTES) return null
  return `This file is ${formatBytes(bytes)}. The limit is ${formatBytes(MAX_SOURCE_BYTES)}, because the conversion runs in your browser. Export a smaller file or simplify the geometry.`
}

type FileValue = {_type: 'file'; asset: {_type: 'reference'; _ref: string}}

const fileValue = (assetId: string): FileValue => ({
  _type: 'file',
  asset: {_type: 'reference', _ref: assetId},
})

/** One patch setting both fields, so the pair lands in a single mutation. */
export function applyPatch(layer: GeoLayer, sourceAssetId: string, generatedAssetId: string) {
  return {
    set: {
      [SOURCE_FIELD[layer]]: fileValue(sourceAssetId),
      [GENERATED_FIELD[layer]]: fileValue(generatedAssetId),
    },
  }
}

/** One patch clearing both fields: they are removed as a pair. */
export function removePatch(layer: GeoLayer) {
  return {unset: [SOURCE_FIELD[layer], GENERATED_FIELD[layer]]}
}

export type ReportRow = {label: string; value: string; warn?: boolean}

const FORMAT_LABEL: Record<ConversionReport['format'], string> = {
  gpx: 'GPX',
  kml: 'KML',
  kmz: 'KMZ',
  geojson: 'GeoJSON',
}

const LIST_LIMIT = 12

function list(values: string[]): string {
  const shown = values.slice(0, LIST_LIMIT).join(', ')
  return values.length > LIST_LIMIT ? `${shown} and ${values.length - LIST_LIMIT} more` : shown
}

/** The report as label/value rows, in the order the editor reads them. */
export function reportRows(report: ConversionReport): ReportRow[] {
  const dropped = Object.entries(report.dropped)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${type}`)

  const rows: ReportRow[] = [
    {label: 'Format', value: FORMAT_LABEL[report.format]},
    {label: 'Features kept', value: String(report.featuresKept)},
    {label: 'Geometries merged', value: String(report.geometriesMerged)},
    {label: 'Dropped', value: dropped.length ? dropped.join(', ') : 'None'},
  ]

  const id = report.idProperty
  if (id) {
    if (id.status === 'found') {
      rows.push({label: 'ID property', value: `"${id.name}" found on every feature`})
    } else if (id.status === 'missing') {
      const available = id.available.length
        ? `Properties in this file: ${list(id.available)}.`
        : 'Features in this file have no properties.'
      rows.push({
        label: 'ID property',
        value: `"${id.name}" is missing on ${id.missingCount} of ${report.featuresKept} features. ${available}`,
        warn: true,
      })
    } else {
      rows.push({
        label: 'ID property',
        value: `"${id.name}" has duplicate values: ${list(id.duplicateValues)}`,
        warn: true,
      })
    }
  }

  rows.push({
    label: 'Size',
    value: `${formatBytes(report.bytesIn)} → ${formatBytes(report.bytesOut)}`,
  })
  return rows
}

export type ErrorDisplay = {headline: string; message?: string; detail?: string}

/**
 * How a failure reads. A GeoConversionError's message is written for editors, except the
 * library's catch-all, whose raw engine text ("Cannot read properties of null…") is only a detail.
 */
export function describeError(error: unknown, stage: 'convert' | 'upload'): ErrorDisplay {
  const text = error instanceof Error ? error.message : String(error)
  if (stage === 'upload') {
    return {
      headline: 'Upload failed. Nothing was changed.',
      detail: text,
    }
  }
  if (error instanceof GeoConversionError && !text.startsWith(WRAPPED_ERROR_PREFIX)) {
    return {headline: 'Could not read this file', message: text}
  }
  return {
    headline: 'Could not read this file',
    message: 'It may be damaged, or not an export this converter understands.',
    detail: text.startsWith(WRAPPED_ERROR_PREFIX) ? text.slice(WRAPPED_ERROR_PREFIX.length) : text,
  }
}
