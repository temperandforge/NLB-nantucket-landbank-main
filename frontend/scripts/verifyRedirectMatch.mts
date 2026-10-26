/**
 * Verifies the redirect matcher. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyRedirectMatch.mts
 *
 * Imports the real matcher, not a copy. Exits non-zero on failure.
 */
import {matchRedirect} from '../sanity/lib/redirectMatch.ts'
import type {MatchableRule} from '../sanity/lib/redirectMatch.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  check(ok, ok ? message : `${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
}

function rule(source: string, destination: string | null, extra: Partial<MatchableRule> = {}): MatchableRule {
  return {source, statusCode: 301, passQuery: false, destination, ...extra}
}

// exact
const exact = [rule('/old', '/new')]
same(matchRedirect(exact, '/old', ''), {status: 301, location: '/new'}, 'exact match redirects')
same(matchRedirect(exact, '/other', ''), null, 'an unmatched path is null')

// case, slash, encoding, double slash
same(matchRedirect(exact, '/OLD/', '')?.location, '/new', 'case and trailing slash are ignored')
same(matchRedirect(exact, '/old//', '')?.location, '/new', 'repeated trailing slashes are ignored')
same(matchRedirect(exact, '/%6Fld', '')?.location, '/new', 'percent-encoding is decoded')
same(matchRedirect(exact, '//old', '')?.location, '/new', 'a leading double slash collapses')
same(matchRedirect([rule('/Old/', '/new')], '/old', '')?.location, '/new', 'a source stored as /Old/ matches /old')
same(matchRedirect(exact, '/%E0%A4%A', ''), null, 'a malformed sequence does not throw')

// query source
const q = [rule('/?p=123', '/news/x')]
same(matchRedirect(q, '/', '?p=123')?.location, '/news/x', 'query source matches')
same(matchRedirect(q, '/', '?p=123&utm=a')?.location, '/news/x', 'query source matches with extra params')
same(matchRedirect(q, '/', ''), null, 'query source needs the param')
same(matchRedirect(q, '/', '?p=124'), null, 'query source needs the value')

// precedence
const prec = [rule('/a', '/plain'), rule('/a?x=1', '/specific')]
same(matchRedirect(prec, '/a', '?x=1')?.location, '/specific', 'most required params wins')
same(matchRedirect(prec, '/a', '')?.location, '/plain', 'without the param the plain rule wins')
same(matchRedirect([...prec].reverse(), '/a', '?x=1')?.location, '/specific', 'precedence ignores rule order')

// passQuery
const pass = [rule('/old', '/new', {passQuery: true})]
same(matchRedirect(pass, '/old', '?utm=a')?.location, '/new?utm=a', 'passQuery appends the query')
same(matchRedirect(pass, '/old', '')?.location, '/new', 'passQuery with no query adds nothing')
same(
  matchRedirect([rule('/old', '/new?x=1', {passQuery: true})], '/old', '?utm=a')?.location,
  '/new?x=1&utm=a',
  'passQuery merges into an existing query with one ?',
)
same(
  matchRedirect([rule('/old', '/new?x=1', {passQuery: true})], '/old', '?x=2')?.location,
  '/new?x=2',
  'an incoming param overrides a same-named destination param',
)
same(matchRedirect(exact, '/old', '?utm=a')?.location, '/new', 'passQuery off drops the query')

// external
const ext = [rule('/old', 'https://example.com/p', {passQuery: true})]
same(matchRedirect(ext, '/old', '')?.location, 'https://example.com/p', 'external destination works')
same(matchRedirect(ext, '/old', '?utm=a')?.location, 'https://example.com/p?utm=a', 'external destination takes the query')

// 410
same(
  matchRedirect([rule('/gone', null, {statusCode: 410})], '/gone', ''),
  {status: 410, location: null},
  '410 has no location',
)

// skipped rules
same(matchRedirect([rule('/old', null)], '/old', ''), null, 'a 301 with no destination is skipped')
same(matchRedirect([rule('/old', '/new', {statusCode: 999})], '/old', ''), null, 'a rule with status 999 is skipped')
same(matchRedirect([rule('/old', '/new', {statusCode: 307})], '/old', '')?.status, 307, 'a 307 is honoured')

// loop
same(matchRedirect([rule('/old', '/old')], '/old', ''), null, 'a destination equal to the request path is null')
same(matchRedirect([rule('/old', '/OLD/')], '/old', ''), null, 'a loop is detected after normalising')

if (failed) {
  console.error('\nredirect matcher verification FAILED')
  process.exit(1)
}
console.log('\nredirect matcher verification passed')
