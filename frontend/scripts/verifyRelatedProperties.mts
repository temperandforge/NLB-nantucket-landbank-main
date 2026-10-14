/**
 * Verifies the related-properties ordering. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyRelatedProperties.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {orderRelatedProperties} from '../sanity/lib/relatedProperties.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) {
    console.error(`       got ${JSON.stringify(actual)}`)
    failed = true
  }
}

const p = (id: string, createdAt: string, types: string[] | null) => ({
  _id: id,
  _createdAt: createdAt,
  propertyTypeIds: types,
})
const names = (list: {_id: string}[]) => list.map((x) => x._id)

const pool = [
  p('old-shared', '2026-01-01', ['t1']),
  p('new-unshared', '2026-09-01', ['t2']),
  p('mid-shared-two', '2026-05-01', ['t1', 't3']),
  p('newest-none', '2026-10-01', null),
]

same(
  names(orderRelatedProperties(pool, ['t1', 't3'], 4)),
  ['mid-shared-two', 'old-shared', 'newest-none', 'new-unshared'],
  'more shared types first, then newest',
)
same(names(orderRelatedProperties(pool, [], 2)), ['newest-none', 'new-unshared'], 'no types: newest first, trimmed to count')
same(names(orderRelatedProperties([], ['t1'], 3)), [], 'empty pool gives empty list')
same(names(orderRelatedProperties(pool, ['t1'], 0)), [], 'count 0 gives empty list')
same(pool.length, 4, 'does not mutate its input')

if (failed) process.exit(1)
