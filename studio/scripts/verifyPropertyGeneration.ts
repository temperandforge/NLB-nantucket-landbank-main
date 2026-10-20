/**
 * Verifies the planning rules for generating properties from the boundary file.
 *
 *   cd studio && npx sanity exec scripts/verifyPropertyGeneration.ts
 *
 * Needs no dataset and no login: it exercises the real `planPropertyGeneration` from
 * src/lib/propertyGeneration.ts - the same function the generate script uses - against small
 * fixtures. Exits non-zero on the first failure.
 */

import {
  planPropertyGeneration,
  REVIEW_SUFFIX,
  slugifyName,
  type BoundaryFeature,
} from '../src/lib/propertyGeneration'

function check(name: string, run: () => void) {
  try {
    run()
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

const feature = (FID: unknown, Name?: unknown, extra: Record<string, unknown> = {}): BoundaryFeature => ({
  properties: {FID, Name, ...extra},
})

check('slug follows the repo rule', () => {
  assert(slugifyName("Settler's Landing") === 'settler-s-landing', 'apostrophe')
  assert(slugifyName('Surfside/Weweeder/TON') === 'surfside-weweeder-ton', 'slashes')
  assert(slugifyName('  Head of the Plains ') === 'head-of-the-plains', 'trim')
})

check('groups every boundary of a name, with the review suffix', () => {
  const plan = planPropertyGeneration(
    [feature(10, 'Alpha'), feature(11, 'Beta'), feature(12, 'Alpha')],
    [],
    'FID',
  )
  assert(plan.create.length === 2, `expected 2, got ${plan.create.length}`)
  const alpha = plan.create.find((p) => p.slug === 'alpha')
  assert(alpha?.name === `Alpha${REVIEW_SUFFIX}`, 'name carries the suffix')
  assert(JSON.stringify(alpha?.boundaryIds) === '["10","12"]', 'ids are strings, in file order')
})

check('FID 0 is a real id, not missing', () => {
  const plan = planPropertyGeneration([feature(0, 'Zero')], [], 'FID')
  assert(plan.create[0]?.boundaryIds[0] === '0', 'FID 0 kept')
})

check('a name that already has a property is skipped (by slug or by name)', () => {
  const plan = planPropertyGeneration(
    [feature(1, 'Alpha'), feature(2, 'Beta')],
    [
      {name: `Alpha${REVIEW_SUFFIX}`, slug: 'alpha', boundaryIds: ['1']},
      {name: 'Beta', slug: 'something-else', boundaryIds: []},
    ],
    'FID',
  )
  assert(plan.create.length === 0, 'nothing to create')
  assert(plan.skippedExisting.length === 2, 'both reported as existing')
})

check('a boundary already assigned elsewhere blocks the name and names the owner', () => {
  const plan = planPropertyGeneration(
    [feature(5, 'Gamma'), feature(6, 'Gamma')],
    [{name: 'Custom group', slug: 'custom-group', boundaryIds: ['6']}],
    'FID',
  )
  assert(plan.create.length === 0, 'not created')
  assert(plan.conflicts.length === 1, 'reported')
  assert(plan.conflicts[0].taken[0].id === '6' && plan.conflicts[0].taken[0].owner === 'Custom group', 'owner named')
})

check('unnamed features are listed, not created', () => {
  const plan = planPropertyGeneration(
    [feature(7, ''), feature(8, '   '), feature(9, undefined, {Acres: 2.5, Owner: 'NLB'})],
    [],
    'FID',
  )
  assert(plan.create.length === 0, 'none created')
  assert(plan.unnamed.length === 3, 'all three listed')
  assert(plan.unnamed[2].acres === 2.5 && plan.unnamed[2].owner === 'NLB', 'acres and owner carried')
})

check('lower-case name from a converted Placemark is accepted', () => {
  const plan = planPropertyGeneration([{properties: {FID: '3', name: 'Delta'}}], [], 'FID')
  assert(plan.create[0]?.slug === 'delta', 'name read')
})

check('two names with the same slug do not both get created', () => {
  const plan = planPropertyGeneration([feature(1, 'A/B'), feature(2, 'A B')], [], 'FID')
  assert(plan.create.length === 1 && plan.slugClashes.length === 1, 'one created, one clash reported')
})

check('features without the id property are ignored', () => {
  const plan = planPropertyGeneration([{properties: {Name: 'No id'}}, feature('', 'Blank id')], [], 'FID')
  assert(plan.create.length === 0 && plan.unnamed.length === 0, 'ignored')
})

check('re-running after creating everything creates nothing (idempotent)', () => {
  const features = [feature(1, 'Alpha'), feature(2, 'Beta')]
  const first = planPropertyGeneration(features, [], 'FID')
  const existing = first.create.map((p) => ({name: p.name, slug: p.slug, boundaryIds: p.boundaryIds}))
  const second = planPropertyGeneration(features, existing, 'FID')
  assert(first.create.length === 2 && second.create.length === 0, 'second pass is empty')
})

console.log('\nAll property generation checks passed.')
