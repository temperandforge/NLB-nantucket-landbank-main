/**
 * Checks the redirect source and destination rules (`src/lib/redirectSource.ts`), including that
 * `normaliseSource` agrees with what the frontend matcher treats as one rule. No dataset needed:
 *
 *   cd studio && npx sanity exec scripts/verifyRedirectSource.ts
 *
 * Imports the real module, and the real frontend matcher for the equivalence checks. Exits non-zero
 * on failure.
 */
import {
  ASSET_EXTENSIONS,
  normaliseSource,
  validateDestinationHref,
  validateSourceShape,
} from '../src/lib/redirectSource'
import {isSafeDestination, matchRedirect} from '../../frontend/sanity/lib/redirectMatch'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) console.log(`  ok   ${message}`)
  else {
    failed = true
    console.error(`  FAIL ${message}`)
  }
}

// Two sources the studio calls equal must be one rule to the matcher, and the reverse.
const rule = (source: string) => ({source, statusCode: 301, passQuery: false, destination: '/x'})
function sameRule(a: string, b: string, request: [string, string]): boolean {
  const hits = (src: string) => matchRedirect([rule(src)], request[0], request[1]) !== null
  return hits(a) && hits(b)
}
const equivalent: [string, string, [string, string]][] = [
  ['/caf%C3%A9', '/café', ['/café', '']],
  ['/A//b', '/a/b', ['/a/b', '']],
  ['/?p=1&q=2', '/?q=2&p=1', ['/', '?p=1&q=2']],
  ['/Old/', '/old', ['/old', '']],
]
for (const [a, b, request] of equivalent) {
  check(normaliseSource(a) === normaliseSource(b), `${a} and ${b} normalise to one source`)
  check(sameRule(a, b, request), `${a} and ${b} are one rule to the matcher`)
}
check(normaliseSource('/a?x=1') !== normaliseSource('/a?x=2'), 'different query values stay different')
check(normaliseSource('/a') !== normaliseSource('/a?x=1'), 'with and without a query stay different')
check(normaliseSource('/') === '/', 'the root stays /')

// shape
check(validateSourceShape('/old-page.html') === true, '.html is an allowed source')
check(validateSourceShape('/x.php?id=3') === true, '.php with a query is an allowed source')
check(validateSourceShape('/v1.2/page') === true, 'a dot in an earlier segment is fine')
for (const ext of ASSET_EXTENSIONS) {
  check(typeof validateSourceShape(`/file.${ext}`) === 'string', `.${ext} is rejected (static asset)`)
}
check(typeof validateSourceShape('/FILE.PNG') === 'string', 'an asset extension is rejected case-insensitively')
check(typeof validateSourceShape('/%61pi/x') === 'string', 'an encoded reserved prefix is rejected')
check(typeof validateSourceShape('/') === 'string', 'a bare / is rejected')
check(validateSourceShape('/?p=123') === true, '/?p=123 is allowed')
check(typeof validateSourceShape('/a*') === 'string', 'a wildcard is rejected')

// destination
for (const ok of ['/new', '/new?x=1#y', 'https://example.org/x', 'HTTP://example.org']) {
  check(validateDestinationHref(ok) === true && isSafeDestination(ok), `destination ${ok} is accepted`)
}
for (const bad of ['old/page', 'javascript:alert(1)', '//evil.example', '/\\evil.example', 'https://', 'mailto:a@b.co', '']) {
  check(
    typeof validateDestinationHref(bad) === 'string' && !isSafeDestination(bad),
    `destination ${JSON.stringify(bad)} is rejected by both the studio and the matcher`,
  )
}

if (failed) {
  console.error('\nverifyRedirectSource: FAILED')
  process.exit(1)
}
console.log('\nverifyRedirectSource: all checks passed')
