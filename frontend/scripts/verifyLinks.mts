/**
 * Verifies which hrefs count as internal (and so go through next/link). Plain script:
 *
 *   cd frontend && node scripts/verifyLinks.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on failure.
 */
import {isInternalHref} from '../sanity/lib/links.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    console.log(`  ok   ${message}`)
  } else {
    failed = true
    console.error(`  FAIL ${message}\n       expected ${expected}, got ${actual}`)
  }
}

same(isInternalHref('/'), true, 'root is internal')
same(isInternalHref('/news'), true, 'site-relative path is internal')
same(isInternalHref('/news?tag=a#b'), true, 'path with query and hash is internal')
same(isInternalHref('#'), false, 'placeholder # is not internal')
same(isInternalHref('#section'), false, 'in-page anchor is not internal')
same(isInternalHref('mailto:a@b.co'), false, 'mailto is not internal')
same(isInternalHref('tel:+15085551234'), false, 'tel is not internal')
same(isInternalHref('https://example.com/x'), false, 'https is not internal')
same(isInternalHref('http://example.com/x'), false, 'http is not internal')
same(isInternalHref('//example.com/x'), false, 'protocol-relative is not internal')
same(isInternalHref('/\\example.com'), false, 'backslash host trick is not internal')
same(isInternalHref(''), false, 'empty is not internal')

if (failed) process.exit(1)
console.log('links ok')
