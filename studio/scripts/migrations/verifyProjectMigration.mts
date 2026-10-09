/**
 * Verifies the project -> property planning (projectsToProperties.ts). No test framework, so a
 * plain script:
 *
 *   cd studio && node scripts/migrations/verifyProjectMigration.mts
 *
 * Imports the real module, not a copy. Exits non-zero on failure.
 */
import {COPIED_FIELDS, planProperties, referenceTargets} from './projectsToProperties.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const ref = (id: string) => ({_key: `k-${id}`, _type: 'reference', _ref: id})
const full = {
  _id: 'p1',
  _type: 'project',
  _rev: 'r',
  _createdAt: 'x',
  _updatedAt: 'y',
  name: 'Long Pond',
  slug: {_type: 'slug', current: 'long-pond'},
  image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-1'}, alt: 'A pond'},
  description: 'A pond.',
  link: '/long-pond',
  propertyTypes: [ref('t1')],
  resources: [ref('r1'), ref('r2')],
  boundaryId: 'long-pond',
  location: {_type: 'geopoint', lat: 41, lng: -70},
  somethingElse: 'not a property field',
}

const published = planProperties([full], new Set())
same(published.create.length, 1, 'a published project is planned')
same(published.create[0].slug, 'long-pond', 'the plan is keyed by slug')
same(published.create[0].draft, undefined, 'a published-only project gets no draft')
same(Object.keys(published.create[0].published ?? {}).sort(), [...COPIED_FIELDS].sort(), 'exactly the property fields are copied')
same(published.create[0].published?.propertyTypes, full.propertyTypes, 'reference arrays are copied with their keys')
same(published.create[0].published?.location, full.location, 'the marker is copied exactly')

const sparse = planProperties([{_id: 'p2', _type: 'project', name: 'Bare', slug: {current: 'bare'}, image: null, boundaryId: null}], new Set())
same(Object.keys(sparse.create[0].published ?? {}), ['name', 'slug'], 'null and missing fields are left out')

const draftOnly = planProperties([{...full, _id: 'drafts.p3', slug: {current: 'draft-only'}}], new Set())
same([draftOnly.create[0].published, !!draftOnly.create[0].draft], [undefined, true], 'a draft-only project stays a draft')

const both = planProperties([full, {...full, _id: 'drafts.p1', name: 'Long Pond (edited)'}], new Set())
same(both.create.length, 1, 'a published project and its draft are one property')
same([both.create[0].published?.name, both.create[0].draft?.name], ['Long Pond', 'Long Pond (edited)'], 'both states are kept')
same(both.create[0].name, 'Long Pond (edited)', 'the planned name is the latest edit')

const existing = planProperties([full], new Set(['long-pond']))
same(existing.create.length, 0, 'a slug that already has a property is not planned')
same(existing.skipped, [{slug: 'long-pond', reason: 'a property with this slug already exists'}], 'and is reported as skipped')

const noSlug = planProperties([{_id: 'p4', _type: 'project', name: 'No slug'}], new Set())
same([noSlug.create.length, noSlug.issues.length], [0, 1], 'a project with no slug is reported, not migrated')

const dup = planProperties([full, {...full, _id: 'p5'}], new Set())
same([dup.create.length, dup.issues.length], [1, 1], 'a second project with the same slug is reported, not migrated')

// A reference to a draft-only project is stored against its base id, so the guard must look for both.
same(
  referenceTargets([{_id: 'a', _type: 'project'}, {_id: 'drafts.b', _type: 'project'}, {_id: 'drafts.a', _type: 'project'}]),
  ['a', 'drafts.a', 'b', 'drafts.b'],
  'reference targets include the base id and the draft id of every project, once each',
)

process.exit(failed ? 1 : 0)
