/**
 * Verifies the GPX/KML/KMZ -> GeoJSON conversion used by the map file uploads.
 *
 *   npx sanity exec scripts/verifyGeoConversion.ts
 *   npx sanity exec scripts/verifyGeoConversion.ts -- <path to a real .kmz/.kml/.gpx/.geojson>
 *
 * With a path, also converts that file (read-only, as boundaries) and prints a report.
 *
 * The repo has no test infrastructure. This imports the real conversion module from
 * src/lib/geoConversion.ts (with @xmldom/xmldom standing in for the browser's DOMParser) rather
 * than restating its rules, so the two cannot drift. Needs no dataset access.
 *
 * Read-only. Exits non-zero on the first failure.
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {DOMParser} from '@xmldom/xmldom'
import {strToU8, zipSync} from 'fflate'

import {convertGeoFile, GeoConversionError, type ParseXml} from '../src/lib/geoConversion'
import {
  applyPatch,
  checkSourceSize,
  describeError,
  GENERATED_FIELD,
  generatedFilename,
  MAX_SOURCE_BYTES,
  removePatch,
  reportRows,
  SOURCE_FIELD,
} from '../src/lib/geoFileInputModel'
import {checkIdProperty} from '../src/lib/geoReport'
import {detectFormat, parseAttributeTable, readSource} from '../src/lib/geoSources'

const parseXml: ParseXml = (xml, mime) =>
  new DOMParser().parseFromString(xml, mime) as unknown as Document

const enc = new TextEncoder()
const fixture = (name: string) =>
  new Uint8Array(readFileSync(resolve(__dirname, 'fixtures/geo', name)))

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.error(`  FAIL ${name}`)
    console.error(error)
    process.exit(1)
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const gpxBytes = fixture('trails.gpx')
const trails = () =>
  convertGeoFile({bytes: gpxBytes, filename: 'trails.gpx', layer: 'trails', parseXml})

console.log('GPX trails:')

check('gpx trails: dedupes consecutive points', () => {
  const geometry = trails().geojson.features[0].geometry as GeoJSON.LineString
  assert(geometry.type === 'LineString', `expected LineString, got ${geometry.type}`)
  assert(geometry.coordinates.length === 3, `expected 3 coordinates, got ${geometry.coordinates.length}`)
  for (const c of geometry.coordinates) {
    assert(c.length === 2 && c.every((n) => typeof n === 'number'), `bad coordinate ${JSON.stringify(c)}`)
  }
})

check('gpx trails: keeps name, omits blank name', () => {
  const [first, second] = trails().geojson.features
  assert(
    JSON.stringify(first.properties) === JSON.stringify({name: 'Test Trail'}),
    `got ${JSON.stringify(first.properties)}`,
  )
  assert(!('name' in (second.properties ?? {})), 'blank name was kept')
  for (const f of [first, second]) {
    for (const key of ['_gpxType', 'coordinateProperties', 'desc']) {
      assert(!(key in (f.properties ?? {})), `${key} was kept`)
    }
  }
})

check('gpx trails: waypoint dropped and counted', () => {
  const {report} = trails()
  assert(report.dropped.Point === 1, `got ${JSON.stringify(report.dropped)}`)
})

check('coordinates rounded to 6 dp', () => {
  const coords = (trails().geojson.features[0].geometry as GeoJSON.LineString).coordinates
  assert(coords.some((c) => c[0] === -70.105631), `got ${JSON.stringify(coords)}`)
})

console.log('\nEntry point:')

check('uppercase extension detected', () => {
  assert(detectFormat('TRAILS.GPX', gpxBytes) === 'gpx', 'GPX not detected')
  assert(detectFormat('A.KMZ', gpxBytes) === 'kmz', 'KMZ not detected')
})

check('zero usable features throws', () => {
  const onlyWaypoint = enc.encode(
    '<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="41" lon="-70"/></gpx>',
  )
  try {
    convertGeoFile({bytes: onlyWaypoint, filename: 'w.gpx', layer: 'trails', parseXml})
  } catch (error) {
    assert(error instanceof GeoConversionError, `wrong error type: ${error}`)
    assert(/no usable/.test((error as Error).message), `message: ${(error as Error).message}`)
    return
  }
  throw new Error('did not throw')
})

check('malformed gpx throws GeoConversionError', () => {
  try {
    convertGeoFile({bytes: enc.encode('<gpx><trk>'), filename: 'bad.gpx', layer: 'trails', parseXml})
  } catch (error) {
    assert(error instanceof GeoConversionError, `wrong error type: ${error}`)
    return
  }
  throw new Error('did not throw')
})

check('filename without extension is rejected', () => {
  try {
    detectFormat('gpx', gpxBytes)
  } catch (error) {
    assert(error instanceof GeoConversionError, `wrong error type: ${error}`)
    return
  }
  throw new Error('did not throw')
})

check('report sizes', () => {
  const {geojson, report} = trails()
  assert(report.bytesIn === gpxBytes.length, `bytesIn ${report.bytesIn}`)
  assert(report.bytesOut === JSON.stringify(geojson).length, `bytesOut ${report.bytesOut}`)
})

const kmlBytes = fixture('boundaries.kml')
const boundaries = (bytes = kmlBytes, filename = 'boundaries.kml') =>
  convertGeoFile({bytes, filename, layer: 'boundaries', parseXml})

function throwsGeo(fn: () => unknown, pattern?: RegExp) {
  try {
    fn()
  } catch (error) {
    assert(error instanceof GeoConversionError, `wrong error type: ${error}`)
    if (pattern) assert(pattern.test((error as Error).message), `message: ${(error as Error).message}`)
    return
  }
  throw new Error('did not throw')
}

const byFid = (fc: GeoJSON.FeatureCollection, fid: string) =>
  fc.features.find((f) => f.properties?.FID === fid)

console.log('\nKML boundaries:')

check('kml: attribute table becomes properties', () => {
  const props = byFid(boundaries().geojson, '0')?.properties ?? {}
  assert(props.FID === '0' && props.Owner === 'NLB' && props.Acres === '1.5', JSON.stringify(props))
  for (const key of ['Seller_Nam', 'description', 'styleUrl', 'fill', 'stroke', 'stroke-width', 'fill-opacity', 'label-color']) {
    assert(!(key in props), `${key} was kept`)
  }
})

check('kml: GeometryCollection flattened', () => {
  const {geojson, report} = boundaries()
  const beta = byFid(geojson, '1')
  assert(beta?.geometry.type === 'MultiPolygon', `got ${beta?.geometry.type}`)
  assert((beta!.geometry as GeoJSON.MultiPolygon).coordinates.length === 2, 'expected 2 polygons')
  assert(report.geometriesMerged >= 1, `merged ${report.geometriesMerged}`)
})

check('kml: mixed collection keeps polygon, drops point', () => {
  const {geojson, report} = boundaries()
  const c = byFid(geojson, '2')
  assert(c?.geometry.type === 'Polygon', `got ${c?.geometry.type}`)
  assert(report.dropped.Point >= 2, `dropped ${JSON.stringify(report.dropped)}`)
  assert(!byFid(geojson, '4'), 'point-only feature survived')
})

check('kml: z stripped', () => {
  for (const f of boundaries().geojson.features) {
    const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
    const flat = (JSON.stringify(g.coordinates).match(/\[[^\[\]]*\]/g) ?? []).map((m) => JSON.parse(m))
    assert(flat.length > 0 && flat.every((p: number[]) => p.length === 2), 'position with z')
  }
})

check('kml: polygon holes preserved', () => {
  const d = byFid(boundaries().geojson, '3')?.geometry as GeoJSON.Polygon
  assert(d?.type === 'Polygon' && d.coordinates.length === 2, `rings ${d?.coordinates?.length}`)
})

check('kml: names are not the id', () => {
  const {geojson} = boundaries()
  const alphas = geojson.features.filter((f) => f.properties?.Name === 'Alpha')
  assert(alphas.length === 2, `expected 2 Alphas, got ${alphas.length}`)
})

check('kml: blank name omitted, non-blank name kept', () => {
  const {geojson} = boundaries()
  assert(byFid(geojson, '0')?.properties?.name === 'Alpha', 'name lost')
  assert(!('name' in (byFid(geojson, '2')?.properties ?? {})), 'blank name kept')
})

check('attribute table: nested tables do not merge rows', () => {
  const html =
    '<table><tr><td><table><tr><td>A</td><td>1</td></tr><tr><td>B</td><td> two </td></tr><tr><td>C</td><td></td></tr></table></td><td>x</td></tr></table>'
  const got = JSON.stringify(parseAttributeTable(html, parseXml))
  assert(got === JSON.stringify({A: '1', B: 'two'}), got)
})

console.log('\nKMZ:')

const kmlText = new TextDecoder().decode(kmlBytes)
const kmz = (entries: Record<string, string>) =>
  zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)])))

check('kmz: unzips doc.kml', () => {
  const zipped = boundaries(kmz({'doc.kml': kmlText, 'x.xsl': '<x/>'}), 'a.kmz')
  assert(
    JSON.stringify(zipped.geojson) === JSON.stringify(boundaries().geojson),
    'features differ from raw KML',
  )
  assert(zipped.report.format === 'kmz', `format ${zipped.report.format}`)
})

check('kmz: kml in a subfolder is found', () => {
  assert(boundaries(kmz({'files/doc.kml': kmlText}), 'a.kmz').geojson.features.length === 4, 'wrong count')
})

check('kmz: no kml inside throws', () => {
  throwsGeo(() => boundaries(kmz({'x.xsl': '<x/>'}), 'a.kmz'), /\.kml/)
})

check('kmz: not a zip throws', () => {
  throwsGeo(() => boundaries(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 'a.kmz'))
})

check('kml named .kml but zipped is treated as kmz', () => {
  const zipped = boundaries(kmz({'doc.kml': kmlText}), 'a.kml')
  assert(zipped.report.format === 'kmz', `format ${zipped.report.format}`)
})

console.log('\nCarry-forward hardening:')

check('detectFormat ignores Object.prototype names', () => {
  for (const name of ['x.constructor', 'x.toString', 'x.__proto__', 'x.hasOwnProperty']) {
    throwsGeo(() => detectFormat(name, new Uint8Array(0)), /Unsupported/)
  }
})

const geojsonConvert = (value: unknown, layer: 'boundaries' | 'trails' = 'boundaries') =>
  convertGeoFile({bytes: enc.encode(JSON.stringify(value)), filename: 'a.geojson', layer, parseXml})
const ring = [[-70, 41], [-70.1, 41], [-70.1, 41.1], [-70, 41]]

check('geojson: single Feature and bare geometry are wrapped', () => {
  const polygon = {type: 'Polygon', coordinates: [ring]}
  assert(geojsonConvert({type: 'Feature', properties: {a: 1}, geometry: polygon}).geojson.features.length === 1, 'feature')
  assert(geojsonConvert(polygon).geojson.features.length === 1, 'bare geometry')
})

check('geojson: Polygon and MultiPolygon are cleaned', () => {
  const dirty = [[-70, 41, 5], [-70, 41, 5], [-70.1, 41, 5], [-70.1, 41.1, 5], [-70, 41, 5]]
  const poly = geojsonConvert({type: 'Polygon', coordinates: [dirty]}).geojson.features[0].geometry as GeoJSON.Polygon
  assert(poly.coordinates[0].length === 4 && poly.coordinates[0].every((p) => p.length === 2), JSON.stringify(poly))
  const multi = geojsonConvert({type: 'MultiPolygon', coordinates: [[dirty], [ring]]}).geojson.features[0]
    .geometry as GeoJSON.MultiPolygon
  assert(multi.type === 'MultiPolygon' && multi.coordinates.length === 2, JSON.stringify(multi))
})

check('geojson: polygon collapsing after rounding is dropped and counted', () => {
  const tiny = [[-70, 41], [-70.0000001, 41], [-70.0000001, 41.0000001], [-70, 41]]
  const result = geojsonConvert({
    type: 'FeatureCollection',
    features: [
      {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [tiny]}},
      {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [ring]}},
    ],
  })
  assert(result.geojson.features.length === 1, `kept ${result.geojson.features.length}`)
  assert(result.report.dropped.Polygon === 1, JSON.stringify(result.report.dropped))
})

check('malformed geojson degrades instead of throwing a TypeError', () => {
  throwsGeo(() => geojsonConvert({type: 'FeatureCollection'}), /features/)
  const good = {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [ring]}}
  const result = geojsonConvert({
    type: 'FeatureCollection',
    features: [
      good,
      {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: []}},
      {type: 'Feature', properties: {}, geometry: {type: 'Polygon'}},
      {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[[null, 41], [NaN, 1], [-70, 41]]]}},
    ],
  })
  assert(result.geojson.features.length === 1, `kept ${result.geojson.features.length}`)
  assert(result.report.dropped.Polygon === 3, JSON.stringify(result.report.dropped))
})

console.log('\nID property and error wrapping:')

const feat = (properties: Record<string, unknown> | null): GeoJSON.Feature => ({
  type: 'Feature',
  properties,
  geometry: {type: 'Point', coordinates: [0, 0]},
})

check('id: FID 0 counts as present', () => {
  for (const zero of ['0', 0]) {
    const r = checkIdProperty([feat({FID: zero}), feat({FID: 1})], 'FID')
    assert(r.missingCount === 0 && r.status === 'found', `${typeof zero}: ${JSON.stringify(r)}`)
  }
})

check('id: reports missing', () => {
  const r = checkIdProperty([feat({b: 1, a: 2}), feat({a: 1, c: 3}), feat(null)], 'FID')
  assert(r.status === 'missing' && r.missingCount === 3, JSON.stringify(r))
  assert(JSON.stringify(r.available) === '["a","b","c"]', JSON.stringify(r.available))
})

check('id: reports duplicates', () => {
  const r = checkIdProperty([feat({FID: 7}), feat({FID: '7'}), feat({FID: 8})], 'FID')
  assert(r.status === 'duplicated', r.status)
  assert(JSON.stringify(r.duplicateValues) === '["7"]', JSON.stringify(r.duplicateValues))
})

check('id: blank string counts as missing', () => {
  const r = checkIdProperty([feat({FID: ''}), feat({FID: 1})], 'FID')
  assert(r.missingCount === 1, `missingCount ${r.missingCount}`)
})

check('id: not computed for trails', () => {
  const r = convertGeoFile({bytes: gpxBytes, filename: 'trails.gpx', layer: 'trails', parseXml})
  assert(r.report.idProperty === null, JSON.stringify(r.report.idProperty))
})

check('id: defaults to FID', () => {
  const p = boundaries().report.idProperty
  assert(p && p.name === 'FID' && p.status === 'found', JSON.stringify(p))
})

check('id: honours a supplied property', () => {
  const p = convertGeoFile({
    bytes: kmlBytes, filename: 'boundaries.kml', layer: 'boundaries', idProperty: 'nope', parseXml,
  }).report.idProperty
  assert(p && p.name === 'nope' && p.status === 'missing' && p.available.includes('FID'), JSON.stringify(p))
})

check('unexpected exceptions are wrapped as GeoConversionError', () => {
  // A TypeError from outside any wrapped step (here: no bytes at all) must still be a GeoConversionError.
  const bad = null as unknown as Uint8Array
  throwsGeo(() => convertGeoFile({bytes: bad, filename: 'a.kml', layer: 'boundaries', parseXml}))
})

check('geojson: GeometryCollection without geometries or with null member degrades', () => {
  const polygon = {type: 'Polygon', coordinates: [ring]}
  const feature = (geometry: unknown) => ({type: 'Feature', properties: {}, geometry})
  const r = geojsonConvert({
    type: 'FeatureCollection',
    features: [
      feature({type: 'GeometryCollection'}),
      feature({type: 'GeometryCollection', geometries: [null, polygon]}),
    ],
  })
  assert(r.geojson.features.length === 1, `kept ${r.geojson.features.length}`)
  assert(r.report.dropped.null === 1, JSON.stringify(r.report.dropped))
})

console.log('\nStudio input helpers:')

check('input: generated field derives from the layer', () => {
  assert(GENERATED_FIELD.boundaries === 'boundaryData', GENERATED_FIELD.boundaries)
  assert(GENERATED_FIELD.trails === 'trailsData', GENERATED_FIELD.trails)
  assert(SOURCE_FIELD.boundaries === 'boundarySource' && SOURCE_FIELD.trails === 'trailsSource', 'source')
})

check('input: apply sets both fields in one patch; remove unsets both', () => {
  const p = applyPatch('boundaries', 'file-a', 'file-b')
  assert(
    JSON.stringify(p) ===
      JSON.stringify({
        set: {
          boundarySource: {_type: 'file', asset: {_type: 'reference', _ref: 'file-a'}},
          boundaryData: {_type: 'file', asset: {_type: 'reference', _ref: 'file-b'}},
        },
      }),
    JSON.stringify(p),
  )
  const r = removePatch('trails')
  assert(JSON.stringify(r) === JSON.stringify({unset: ['trailsSource', 'trailsData']}), JSON.stringify(r))
})

check('input: generated filename', () => {
  const cases: [string, string][] = [
    ['Land_Bank.kmz', 'Land_Bank.geojson'],
    ['a.b.gpx', 'a.b.geojson'],
    ['noext', 'noext.geojson'],
    ['.kml', '.kml.geojson'],
  ]
  for (const [input, expected] of cases) {
    assert(generatedFilename(input) === expected, `${input} -> ${generatedFilename(input)}`)
  }
})

check('input: size guard at 25 MB', () => {
  assert(MAX_SOURCE_BYTES === 25 * 1024 * 1024, String(MAX_SOURCE_BYTES))
  assert(checkSourceSize(MAX_SOURCE_BYTES) === null, 'limit itself rejected')
  assert(/25\.0 MB/.test(checkSourceSize(MAX_SOURCE_BYTES + 1) ?? ''), 'over limit accepted')
})

check('input: report rows (boundaries, found)', () => {
  const rows = reportRows(boundaries().report)
  const labels = rows.map((r) => r.label)
  for (const l of ['Format', 'Features kept', 'Geometries merged', 'Dropped', 'ID property', 'Size']) {
    assert(labels.includes(l), `missing ${l}: ${labels}`)
  }
  const id = rows.find((r) => r.label === 'ID property')!
  assert(!id.warn && !/Properties in this file/.test(id.value), id.value)
})

check('input: report rows (trails) have no ID row', () => {
  const rows = reportRows(trails().report)
  assert(!rows.some((r) => r.label === 'ID property'), 'trails show an ID row')
  assert(rows.find((r) => r.label === 'Dropped')!.value === '1 Point', JSON.stringify(rows))
})

check('input: available names only when missing; duplicates when duplicated', () => {
  const base = boundaries().report
  const missing = reportRows({
    ...base,
    idProperty: {name: 'X', status: 'missing', missingCount: 2, duplicateValues: [], available: ['FID', 'name']},
  }).find((r) => r.label === 'ID property')!
  assert(missing.warn && /FID, name/.test(missing.value), missing.value)
  const dup = reportRows({
    ...base,
    idProperty: {name: 'FID', status: 'duplicated', missingCount: 0, duplicateValues: ['3', '7'], available: ['FID', 'name']},
  }).find((r) => r.label === 'ID property')!
  assert(dup.warn && /3, 7/.test(dup.value) && !/name/.test(dup.value), dup.value)
})

check('input: wrapped engine error is a detail under a plain headline', () => {
  let caught: unknown
  try {
    convertGeoFile({bytes: null as unknown as Uint8Array, filename: 'a.kml', layer: 'boundaries', parseXml})
  } catch (error) {
    caught = error
  }
  const d = describeError(caught, 'convert')
  assert(d.headline === 'Could not read this file', d.headline)
  assert(d.detail && !d.detail.startsWith('The file could not be converted'), JSON.stringify(d))
  const plain = describeError(new GeoConversionError('The file is not valid XML.'), 'convert')
  assert(plain.message === 'The file is not valid XML.' && !plain.detail, JSON.stringify(plain))
  const upload = describeError(new Error('network down'), 'upload')
  assert(/Nothing was changed/.test(upload.headline) && upload.detail === 'network down', JSON.stringify(upload))
})

console.log('\nAll geo conversion checks passed.')

// Optional: run a real file through the converter and print what happened.
const realPath = process.argv.slice(2).find((a) => /\.(kmz|kml|gpx|geojson|json)$/i.test(a))
if (realPath) {
  console.log(`\nReal file: ${realPath}`)
  const bytes = new Uint8Array(readFileSync(realPath))
  const raw = readSource(detectFormat(realPath, bytes), bytes, parseXml)
  const typesOf = (fc: GeoJSON.FeatureCollection) => {
    const t: Record<string, number> = {}
    for (const f of fc.features) t[f.geometry?.type ?? 'null'] = (t[f.geometry?.type ?? 'null'] ?? 0) + 1
    return t
  }
  const result = convertGeoFile({bytes, filename: realPath, layer: 'boundaries', parseXml})
  const withFid = result.geojson.features.filter((f) => f.properties && 'FID' in f.properties).length
  const names = result.geojson.features.map((f) => f.properties?.name)
  console.log(`  features before normalisation: ${raw.features.length}`, typesOf(raw))
  console.log(`  features after normalisation:  ${result.geojson.features.length}`, typesOf(result.geojson))
  console.log(`  features with FID: ${withFid}`)
  console.log(`  distinct names: ${new Set(names).size} (blank/missing: ${names.filter((n) => !n).length})`)
  console.log('  sample properties:', JSON.stringify(result.geojson.features[0].properties))
  console.log('  report:', JSON.stringify(result.report))
}
