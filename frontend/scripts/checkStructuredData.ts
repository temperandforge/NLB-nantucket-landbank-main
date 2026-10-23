/**
 * Assertions for the pure SEO and structured-data helpers. There is no test framework, so this is
 * run directly: `npx tsx scripts/checkStructuredData.ts` from `frontend`. Exits non-zero on failure.
 */
import assert from 'node:assert/strict'

import {buildMetadata} from '../sanity/lib/seo'
import {absoluteUrl, getSiteUrl} from '../sanity/lib/siteUrl'

const checks: [string, () => void][] = []
const check = (name: string, fn: () => void) => checks.push([name, fn])

const ORIGIN = 'https://x.org'

check('getSiteUrl rejects non-https', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL
  assert.equal(getSiteUrl({siteUrl: 'http://x.org'}), null)
  assert.equal(getSiteUrl({siteUrl: 'not a url'}), null)
  assert.equal(getSiteUrl(null), null)
})
check('getSiteUrl strips a trailing slash and falls back to env', () => {
  assert.equal(getSiteUrl({siteUrl: 'https://x.org/'}), ORIGIN)
  process.env.NEXT_PUBLIC_SITE_URL = 'https://env.org'
  assert.equal(getSiteUrl({siteUrl: 'http://bad'}), 'https://env.org')
  delete process.env.NEXT_PUBLIC_SITE_URL
})
check('absoluteUrl needs an origin', () => {
  assert.equal(absoluteUrl('/a', null), null)
  assert.equal(absoluteUrl('/a', ORIGIN), 'https://x.org/a')
})
check('buildMetadata derives a canonical and omits unknown description', () => {
  const m = buildMetadata({path: '/a', title: 'T', defaults: {origin: ORIGIN}})
  assert.equal(m.alternates?.canonical, 'https://x.org/a')
  assert.equal(m.title, 'T')
  assert.ok(!('description' in m))
})
check('buildMetadata with no origin has no canonical', () => {
  const m = buildMetadata({path: '/a', title: 'T'})
  assert.equal(m.alternates, undefined)
})
check('seo override beats the derived title and description', () => {
  const m = buildMetadata({seo: {title: 'S', description: 'D'}, title: 'T', description: 'x', path: '/a'})
  assert.equal(m.title, 'S')
  assert.equal(m.description, 'D')
})
check('noIndex emits robots noindex', () => {
  const m = buildMetadata({seo: {noIndex: true}, path: '/a', title: 'T'})
  assert.deepEqual(m.robots, {index: false, follow: true})
  assert.equal(buildMetadata({seo: {noIndex: false}, path: '/a'}).robots, undefined)
})
check('falls back to the default image and description', () => {
  const image = {url: 'https://cdn/x.jpg', alt: '', width: 1200, height: 627}
  const m = buildMetadata({path: '/a', title: 'T', defaults: {origin: ORIGIN, description: 'site', image}})
  assert.equal(m.description, 'site')
  assert.deepEqual(m.openGraph?.images, [image])
})

let failed = 0
for (const [name, fn] of checks) {
  try {
    fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${name}\n${(error as Error).message}`)
  }
}
if (failed) process.exit(1)
console.log(`${checks.length} checks passed`)
