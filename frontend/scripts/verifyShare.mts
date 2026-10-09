/**
 * Verifies the share addresses. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyShare.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on failure.
 */
import {shareUrl} from '../sanity/lib/share.ts'

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

const page = 'https://www.nantucketlandbank.org/news/the-benefits-of-walking'

same(
  shareUrl('facebook', page),
  'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking',
  'Facebook gets the encoded page address',
)
same(
  shareUrl('linkedin', page),
  'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking',
  'LinkedIn gets the encoded page address',
)
same(
  shareUrl('facebook', `${page}?a=1&b=2#comments`),
  'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.nantucketlandbank.org%2Fnews%2Fthe-benefits-of-walking%3Fa%3D1%26b%3D2',
  'the query is kept (and encoded) and the fragment is dropped',
)
same(shareUrl('facebook', 'not a url'), '', 'an invalid address gives no share address')
same(shareUrl('linkedin', ''), '', 'an empty address gives no share address')

if (failed) process.exit(1)
