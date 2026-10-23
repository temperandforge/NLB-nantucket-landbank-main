/**
 * Verifies the pure path diff and redirect write plan used by the auto-redirect function.
 *
 *   npx sanity exec scripts/verifyRedirectDiff.ts
 *
 * Imports the real module from src/lib/redirectDiff.ts rather than restating its rules. Needs no
 * dataset access. Read-only. Exits non-zero on any failure.
 */

import {
  diffPagePaths,
  planRedirectWrites,
  type PagePathChange,
} from '../src/lib/redirectDiff'

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`ok   ${name}`)
  } else {
    failed++
    console.log(`FAIL ${name}\n     expected ${e}\n     actual   ${a}`)
  }
}

const state = (slug: string, ancestors: string[] = [], pathOnly = false) => ({
  slug,
  pathOnly,
  ancestors,
})

// leaf rename
check(
  'leaf rename',
  diffPagePaths({
    pageId: 'p',
    before: state('history', ['about-us']),
    after: state('our-history', ['about-us']),
    descendants: [],
  }),
  [{pageId: 'p', oldPath: 'about-us/history', newPath: 'about-us/our-history'}],
)

// ancestor rename with descendants, one pathOnly
check(
  'ancestor rename',
  diffPagePaths({
    pageId: 'p',
    before: state('about-us'),
    after: state('about'),
    descendants: [
      {id: 'd1', pathOnly: false, belowSlugs: ['staff']},
      {id: 'd2', pathOnly: false, belowSlugs: ['staff', 'jobs']},
      {id: 'd3', pathOnly: true, belowSlugs: ['group']},
    ],
  }),
  [
    {pageId: 'p', oldPath: 'about-us', newPath: 'about'},
    {pageId: 'd1', oldPath: 'about-us/staff', newPath: 'about/staff'},
    {pageId: 'd2', oldPath: 'about-us/staff/jobs', newPath: 'about/staff/jobs'},
  ],
)

// re-parent
check(
  're-parent',
  diffPagePaths({
    pageId: 'p',
    before: state('history'),
    after: state('history', ['explore']),
    descendants: [],
  }),
  [{pageId: 'p', oldPath: 'history', newPath: 'explore/history'}],
)

// pathOnly page renamed: descendants change, the page does not
check(
  'pathOnly page before and after',
  diffPagePaths({
    pageId: 'p',
    before: state('about-us', [], true),
    after: state('about', [], true),
    descendants: [{id: 'd1', pathOnly: false, belowSlugs: ['staff']}],
  }),
  [{pageId: 'd1', oldPath: 'about-us/staff', newPath: 'about/staff'}],
)

// toggling pathOnly false -> true
const toggled = diffPagePaths({
  pageId: 'p',
  before: state('about-us'),
  after: state('about-us', [], true),
  descendants: [],
})
check('pathOnly toggled on', toggled, [{pageId: 'p', oldPath: 'about-us', newPath: null}])
check('pathOnly toggled on creates nothing', planRedirectWrites(toggled, []), {
  create: [],
  disable: [],
})

// no-op
check(
  'no-op',
  diffPagePaths({
    pageId: 'p',
    before: state('a', ['x']),
    after: state('a', ['x']),
    descendants: [{id: 'd', pathOnly: false, belowSlugs: ['b']}],
  }),
  [],
)

// first publish: oldPath null, and a stale redirect from the new path is disabled
const first = diffPagePaths({pageId: 'p', before: null, after: state('about'), descendants: []})
check('first publish change', first, [{pageId: 'p', oldPath: null, newPath: 'about'}])
check(
  'first publish disables a colliding redirect',
  planRedirectWrites(first, [
    {id: 'r1', source: '/about'},
    {id: 'r2', source: '/elsewhere'},
  ]),
  {create: [], disable: ['r1']},
)

// rename and rename back
check(
  'rename and rename back',
  planRedirectWrites([{pageId: 'p', oldPath: 'b', newPath: 'a'}], [{id: 'r1', source: '/a'}]),
  {create: [{source: '/b', pageId: 'p'}], disable: ['r1']},
)

// existing source skip, case- and slash-insensitive
const rename: PagePathChange[] = [{pageId: 'p', oldPath: 'a/old', newPath: 'a/new'}]
check('plain create has a leading slash', planRedirectWrites(rename, []), {
  create: [{source: '/a/old', pageId: 'p'}],
  disable: [],
})
check('existing source skips create', planRedirectWrites(rename, [{id: 'r', source: '/a/old'}]), {
  create: [],
  disable: [],
})
check(
  'existing source match ignores case and trailing slash',
  planRedirectWrites(rename, [{id: 'r', source: '/A/Old/'}]),
  {create: [], disable: []},
)

// depth guard
check(
  'depth guard drops a too-deep descendant',
  diffPagePaths({
    pageId: 'p',
    before: state('about-us'),
    after: state('about', ['x']),
    descendants: [
      {id: 'd1', pathOnly: false, belowSlugs: ['staff']},
      {id: 'd2', pathOnly: false, belowSlugs: ['staff', 'jobs']},
    ],
  }),
  [
    {pageId: 'p', oldPath: 'about-us', newPath: 'x/about'},
    {pageId: 'd1', oldPath: 'about-us/staff', newPath: 'x/about/staff'},
  ],
)

if (failed) {
  console.log(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nall ok')
