/**
 * Verifies the redirect source rules in src/lib/redirectSource.ts.
 *
 *   npx sanity exec scripts/verifyRedirectSource.ts
 *
 * Imports the real module rather than restating its rules. Needs no dataset access. Read-only.
 * Exits non-zero on the first failure.
 */

import {normaliseSource, validateSourceShape} from '../src/lib/redirectSource'

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.error(`  FAIL ${name}`)
    console.error(error)
    process.exit(1)
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

console.log('normaliseSource:')

check('lowercases and strips the trailing slash', () => {
  const got = normaliseSource('/About-Us/Staff/')
  assert(got === '/about-us/staff', `got ${got}`)
})

check('keeps the root as /', () => {
  assert(normaliseSource('/') === '/', `got ${normaliseSource('/')}`)
})

check('lowercases the path and keeps the query as written', () => {
  const got = normaliseSource('/Old?P=1')
  assert(got === '/old?P=1', `got ${got}`)
})

console.log('validateSourceShape:')

for (const bad of ['old', '/a#b', '/a/*', '/api/x', '/_next/x', '/studio', '', undefined]) {
  check(`rejects ${JSON.stringify(bad)}`, () => {
    const got = validateSourceShape(bad)
    assert(typeof got === 'string', `expected a message, got ${JSON.stringify(got)}`)
  })
}

for (const good of ['/old', '/?p=123']) {
  check(`accepts ${JSON.stringify(good)}`, () => {
    const got = validateSourceShape(good)
    assert(got === true, `expected true, got ${JSON.stringify(got)}`)
  })
}

console.log('all ok')
