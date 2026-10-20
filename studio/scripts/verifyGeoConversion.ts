/**
 * Verifies the GPX/KML/KMZ -> GeoJSON conversion used by the map file uploads.
 *
 *   npx sanity exec scripts/verifyGeoConversion.ts
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

import {convertGeoFile, GeoConversionError, type ParseXml} from '../src/lib/geoConversion'
import {detectFormat} from '../src/lib/geoSources'

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

check('report sizes', () => {
  const {geojson, report} = trails()
  assert(report.bytesIn === gpxBytes.length, `bytesIn ${report.bytesIn}`)
  assert(report.bytesOut === JSON.stringify(geojson).length, `bytesOut ${report.bytesOut}`)
})

console.log('\nAll geo conversion checks passed.')
