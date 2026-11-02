/**
 * Verifies which page blocks count as the first screen. There is no test framework, so this is a
 * plain script:
 *
 *   cd frontend && node scripts/verifyEnter.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on failure.
 */
import {ENTER_LOAD_BLOCKS, enterAttrs} from '../sanity/lib/enter.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

same(ENTER_LOAD_BLOCKS, 2, 'the first two blocks animate on load')
same(enterAttrs(0), {'data-enter': 'load', 'data-enter-order': '0'}, 'block 0 is load, order 0')
same(enterAttrs(1), {'data-enter': 'load', 'data-enter-order': '1'}, 'block 1 is load, order 1')
same(enterAttrs(2), {'data-enter': 'scroll'}, 'block 2 is scroll')
same(enterAttrs(40), {'data-enter': 'scroll'}, 'a late block is scroll')
// A bad index must never throw or hide anything: it falls to the scroll layer, which is static
// without scroll-driven animation support.
same(enterAttrs(-1), {'data-enter': 'scroll'}, 'a negative index is scroll')
same(enterAttrs(1.5), {'data-enter': 'scroll'}, 'a fractional index is scroll')
same(enterAttrs(Number.NaN), {'data-enter': 'scroll'}, 'NaN is scroll')
same(enterAttrs(undefined as unknown as number), {'data-enter': 'scroll'}, 'a missing index is scroll')

if (failed) process.exit(1)
