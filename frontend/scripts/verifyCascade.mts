/**
 * Verifies the headline word splitting used by the Cascade component. There is no test
 * framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyCascade.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on failure.
 * `@vercel/stega` (a dependency of next-sanity) resolves from frontend/.
 */
import {vercelStegaCombine} from '@vercel/stega'
import {CASCADE_MAX_INDEX, cascadeWords} from '../sanity/lib/cascade.ts'

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

same(cascadeWords('Protecting open spaces'), ['Protecting', 'open', 'spaces'], 'splits on spaces')
same(cascadeWords('  a   b\n c '), ['a', 'b', 'c'], 'collapses runs of whitespace and drops empty entries')
same(cascadeWords('  a   b\n c ')!.join(' '), 'a b c', 'rejoining with single spaces is clean')
same(cascadeWords(''), [], 'empty string renders nothing')
same(cascadeWords('   '), [], 'whitespace-only renders nothing')
same(cascadeWords(null), [], 'null renders nothing')
same(cascadeWords(undefined), [], 'undefined renders nothing')

const forty = Array.from({length: 40}, (_, i) => `w${i}`).join(' ')
same(cascadeWords(forty)!.length, 40, 'a 40-word string keeps all 40 words')
same(CASCADE_MAX_INDEX, 14, 'the delay cap is on the index, at 14')

const stega = vercelStegaCombine('Hello world', {origin: 'sanity.io', href: '/x'})
same(cascadeWords(stega), null, 'a stega-encoded string is not split')

if (failed) process.exit(1)
