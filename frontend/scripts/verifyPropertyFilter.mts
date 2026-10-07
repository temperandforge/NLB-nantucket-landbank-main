/**
 * Verifies the Properties archive filter. No test framework, so a plain script:
 *
 *   cd frontend && node scripts/verifyPropertyFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {
  EMPTY_SELECTION,
  filterProperties,
  hasSelection,
  parseSelection,
  propertyTypeOptions,
  resourceOptions,
  toggleSlug,
  withSelection,
} from '../sanity/lib/propertyFilter.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const park = {slug: 'park', title: 'Park', order: 20}
const trail = {slug: 'trail', title: 'Trail', order: 30}
const beach = {slug: 'beach', title: 'Beach', order: 10}
const dogs = {slug: 'dogs', title: 'Dog friendly', order: 10}
const parking = {slug: 'parking', title: 'Parking', order: 20}

const properties = [
  {name: 'a', propertyTypes: [park, trail], resources: [dogs]},
  {name: 'b', propertyTypes: [park], resources: [dogs, parking]},
  {name: 'c', propertyTypes: [beach], resources: [parking]},
  {name: 'd', propertyTypes: [null, {slug: 'x', title: null, order: null}], resources: null},
  {name: 'e'},
]

same(propertyTypeOptions(properties).map((o) => o.slug), ['beach', 'park', 'trail'], 'type options are those in use, in their own order, ignoring unpublished ones')
same(resourceOptions(properties).map((o) => o.slug), ['dogs', 'parking'], 'resource options are those in use, in their own order')

const names = (selection: Parameters<typeof filterProperties>[1]) => filterProperties(properties, selection).map((p) => p.name)
same(names(EMPTY_SELECTION), ['a', 'b', 'c', 'd', 'e'], 'no selection keeps every property')
same(names({types: ['park'], resources: []}), ['a', 'b'], 'one type keeps properties with it')
same(names({types: ['park', 'beach'], resources: []}), ['a', 'b', 'c'], 'several types in a group are OR')
same(names({types: ['park'], resources: ['parking']}), ['b'], 'groups are AND')
same(names({types: ['trail'], resources: ['parking']}), [], 'no match gives an empty list')
same(names({types: [], resources: ['dogs', 'parking']}), ['a', 'b', 'c'], 'several resources are OR')
same(names({types: ['park', 'beach', 'trail'], resources: []}), ['a', 'b', 'c'], 'properties whose types are unpublished (null) or missing never match a chosen type')

const typeOptions = propertyTypeOptions(properties)
const resOptions = resourceOptions(properties)
same(parseSelection('?type=park,trail&resource=dogs', typeOptions, resOptions), {types: ['park', 'trail'], resources: ['dogs']}, 'known slugs are read from the address')
same(parseSelection('?type=nope,park,,park', typeOptions, resOptions).types, ['park'], 'unknown, blank and repeated slugs are ignored')
same(parseSelection('?type=dogs', typeOptions, resOptions), EMPTY_SELECTION, 'a slug from the other group is ignored')
same(parseSelection('', typeOptions, resOptions), EMPTY_SELECTION, 'an empty address selects nothing')
same(parseSelection('?type=trail,beach', typeOptions, resOptions).types, ['beach', 'trail'], 'the selection follows the option order')

same(withSelection('', {types: ['park', 'trail'], resources: ['dogs']}), '?type=park,trail&resource=dogs', 'the selection is written with literal commas')
same(withSelection('?utm=1&type=old#x', {types: [], resources: ['dogs']}), '?utm=1&resource=dogs', 'other parameters are kept and a cleared group is removed')
same(withSelection('?utm=1&type=park', EMPTY_SELECTION), '?utm=1', 'clearing everything keeps other parameters')
same(withSelection('?type=park', EMPTY_SELECTION), '', 'clearing everything leaves no query string')
same(withSelection('', {types: ['a b'], resources: []}), '?type=a%20b', 'a slug is encoded')

same(toggleSlug(['a'], 'b'), ['a', 'b'], 'toggling adds a slug')
same(toggleSlug(['a', 'b'], 'a'), ['b'], 'toggling removes a slug')
same([hasSelection(EMPTY_SELECTION), hasSelection({types: ['a'], resources: []})], [false, true], 'hasSelection')

process.exit(failed ? 1 : 0)
