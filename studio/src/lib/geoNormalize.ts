/**
 * Normalises raw GeoJSON from any source format into what the map reads.
 *
 * Order matters: flatten GeometryCollections -> keep only the layer's geometry (counting what is
 * dropped) -> strip to 2D -> round -> drop consecutive duplicate points. Properties are passed
 * through untouched; each source step decides which ones it produces.
 */

import type {GeoLayer} from './geoReport'

type Position = number[]

/** 6 decimal places is ~0.1 m, far finer than a map at property scale can show. */
const DECIMALS = 6
const FACTOR = 10 ** DECIMALS

const LAYER_TYPES: Record<GeoLayer, {single: string; multi: string}> = {
  boundaries: {single: 'Polygon', multi: 'MultiPolygon'},
  trails: {single: 'LineString', multi: 'MultiLineString'},
}

export type NormalizeResult = {
  features: GeoJSON.Feature[]
  merged: number
  dropped: Record<string, number>
}

function roundPosition(p: Position): Position {
  // [lng, lat] only: this strips Z and M.
  return [Math.round(p[0] * FACTOR) / FACTOR, Math.round(p[1] * FACTOR) / FACTOR]
}

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])

function dedupe(points: Position[]): Position[] {
  return points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1])
}

/** Malformed input (non-array, null or NaN positions) is cleaned away rather than thrown on. */
const cleanLine = (line: Position[]) =>
  dedupe((Array.isArray(line) ? line : []).filter(isPosition).map(roundPosition))

/** A ring needs 4 positions to enclose area; fewer means it collapsed after deduping. */
function cleanPolygon(rings: Position[][]): Position[][] | null {
  const cleaned = (Array.isArray(rings) ? rings : []).map(cleanLine)
  // The outer ring decides whether there is a polygon at all; a collapsed hole is just omitted.
  if (!cleaned.length || cleaned[0].length < 4) return null
  return cleaned.filter((r) => r.length >= 4)
}

function count(dropped: Record<string, number>, type: string) {
  dropped[type] = (dropped[type] ?? 0) + 1
}

/** Every non-collection geometry inside `geometry`, recursing through nested collections. */
type Part = Exclude<GeoJSON.Geometry, GeoJSON.GeometryCollection>

function members(geometry: GeoJSON.Geometry): Part[] {
  return geometry.type === 'GeometryCollection' ? geometry.geometries.flatMap(members) : [geometry]
}

export function normalizeCollection(
  raw: GeoJSON.FeatureCollection,
  layer: GeoLayer,
): NormalizeResult {
  const {single, multi} = LAYER_TYPES[layer]
  const features: GeoJSON.Feature[] = []
  const dropped: Record<string, number> = {}
  let merged = 0

  for (const feature of raw.features) {
    const geometry = feature?.geometry
    if (!geometry) {
      count(dropped, 'null')
      continue
    }

    if (geometry.type === 'GeometryCollection') merged++

    // The layer's geometries as single parts (one Polygon / LineString coordinate array each).
    const kept: unknown[] = []
    for (const part of members(geometry)) {
      if (part.type === single) kept.push(part.coordinates)
      else if (part.type === multi && Array.isArray(part.coordinates)) {
        kept.push(...(part.coordinates as unknown[]))
      }
      else count(dropped, part.type)
    }

    const cleaned =
      layer === 'boundaries'
        ? (kept as Position[][][]).map(cleanPolygon).filter((p) => p !== null)
        : (kept as Position[][]).map(cleanLine).filter((l) => l.length >= 2)
    // Parts that collapsed to nothing are dropped and counted like any other unusable geometry.
    for (let i = cleaned.length; i < kept.length; i++) count(dropped, single)
    if (!cleaned.length) continue

    // A Multi* input stays Multi*; a collection becomes Multi* only if it still has several parts.
    const asMulti = geometry.type === multi || cleaned.length > 1
    const out = (
      asMulti ? {type: multi, coordinates: cleaned} : {type: single, coordinates: cleaned[0]}
    ) as GeoJSON.Geometry

    features.push({type: 'Feature', properties: feature.properties ?? {}, geometry: out})
  }

  return {features, merged, dropped}
}
