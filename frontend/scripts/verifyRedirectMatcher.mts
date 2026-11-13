/**
 * Pins the proxy matcher (`config.matcher` in proxy.ts): which request paths reach the redirect
 * lookup. Plain script:
 *
 *   cd frontend && node scripts/verifyRedirectMatcher.mts
 *
 * proxy.ts cannot be imported (it pulls in the Sanity client and `@/` aliases), and Next reads the
 * matcher statically, so this reads the literal out of the source text and runs it as a regex. It
 * also checks that the asset extensions excluded there equal `ASSET_EXTENSIONS` in
 * `studio/src/lib/redirectSource.ts`, which Studio uses to reject a source that could never fire.
 * Exits non-zero on failure.
 */
import {readFileSync} from 'node:fs'

const proxySource = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8')
const studioSource = readFileSync(new URL('../../studio/src/lib/redirectSource.ts', import.meta.url), 'utf8')

let failed = false
function check(condition: boolean, message: string) {
  if (condition) console.log(`  ok   ${message}`)
  else {
    failed = true
    console.error(`  FAIL ${message}`)
  }
}

// The matcher literal, unescaped the way JS reads the string.
const literal = proxySource.match(/matcher:\s*\[\s*'((?:[^'\\]|\\.)*)'/)?.[1]
if (!literal) throw new Error('could not find the matcher literal in proxy.ts')
const pattern: string = JSON.parse(`"${literal.replace(/"/g, '\\"')}"`)
// Next compiles the matcher with path-to-regexp; for this one group, anchoring it is equivalent.
const matcher = new RegExp(`^${pattern}$`)
const reaches = (path: string) => matcher.test(path)

for (const path of ['/', '/news', '/about/history', '/apiary', '/api-docs', '/_nextfoo', '/old-page.html', '/x.php', '/index.htm', '/a.b/c', '/v1.2/page', '/files/report.pdf', '/Old.HTML']) {
  check(reaches(path), `${path} reaches the proxy`)
}
for (const path of ['/api', '/api/x', '/api/x/y', '/_next', '/_next/static/chunks/a.js', '/logo.png', '/images/a.JPG'.toLowerCase(), '/a/b.css', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/fonts/a.woff2', '/geojson/boundaries.geojson']) {
  check(!reaches(path), `${path} does not reach the proxy`)
}

// The extension list in the matcher, expanded (`jpe?g` -> jpg, jpeg), against Studio's.
const group = pattern.match(/\.\*\\\.\(\?:([^)]*)\)\$/)?.[1]
if (!group) throw new Error('could not find the extension group in the matcher')
const fromMatcher = group
  .split('|')
  .flatMap((alt) => [alt.replace(/.\?/g, ''), alt.replace(/\?/g, '')])
  .filter((ext, i, all) => all.indexOf(ext) === i)
  .sort()
const listBody = studioSource.match(/ASSET_EXTENSIONS: readonly string\[\] = \[([^\]]*)\]/)?.[1] ?? ''
const fromStudio = [...listBody.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]).sort()
check(
  JSON.stringify(fromMatcher) === JSON.stringify(fromStudio),
  `proxy.ts and studio ASSET_EXTENSIONS list the same extensions (${fromMatcher.length})`,
)
if (JSON.stringify(fromMatcher) !== JSON.stringify(fromStudio)) {
  console.error('       proxy:', fromMatcher.join(','), '\n       studio:', fromStudio.join(','))
}

if (failed) {
  console.error('\nverifyRedirectMatcher: FAILED')
  process.exit(1)
}
console.log('\nverifyRedirectMatcher: all checks passed')
