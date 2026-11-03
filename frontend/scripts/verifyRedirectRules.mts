/**
 * Verifies the proxy's redirect-rule cache. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyRedirectRules.mts
 *
 * Imports the real loader, not a copy. Exits non-zero on failure. Refresh failures are logged by the
 * loader on purpose, so the "[redirects] rule refresh failed" lines below are expected.
 */
import {createRulesLoader} from '../sanity/lib/redirectRules.ts'
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

const RULES_A: MatchableRule[] = [{source: '/a', statusCode: 301, passQuery: false, destination: '/x'}]
const RULES_B: MatchableRule[] = [{source: '/b', statusCode: 301, passQuery: false, destination: '/y'}]

type Step = 'ok-a' | 'ok-b' | 'fail' | 'hang'

/** A fake clock and a load that follows a script of outcomes, counting its calls. */
function harness(steps: Step[], timeoutMs = 1000) {
  let clock = 0
  let calls = 0
  const loader = createRulesLoader({
    ttlMs: 60_000,
    timeoutMs,
    failureBackoffMs: 10_000,
    now: () => clock,
    load: async () => {
      const step = steps[calls] ?? 'fail'
      calls += 1
      if (step === 'ok-a') return RULES_A
      if (step === 'ok-b') return RULES_B
      if (step === 'hang') return new Promise<MatchableRule[]>(() => {})
      throw new Error('sanity is down')
    },
  })
  return {
    loader,
    advance: (ms: number) => {
      clock += ms
    },
    calls: () => calls,
  }
}

async function neverThrows(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    return await fn()
  } catch (error) {
    check(false, `loader threw: ${String(error)}`)
    return undefined
  }
}

// fresh cache does not reload
{
  const h = harness(['ok-a', 'ok-b'])
  same(await h.loader(), RULES_A, 'first call loads the rules')
  h.advance(59_999)
  same(await h.loader(), RULES_A, 'inside the TTL the cached rules are returned')
  same(h.calls(), 1, 'inside the TTL load is not called again')
}

// stale cache reloads once even with concurrent callers
{
  const h = harness(['ok-a', 'ok-b'])
  await h.loader()
  h.advance(60_000)
  const results = await Promise.all(Array.from({length: 10}, () => h.loader()))
  same(h.calls(), 2, 'ten concurrent callers on a stale cache share one refresh')
  check(
    results.every((r) => JSON.stringify(r) === JSON.stringify(RULES_B)),
    'every concurrent caller gets the refreshed rules',
  )
}

// failed refresh serves stale rules and backs off
{
  const h = harness(['ok-a', 'fail', 'ok-b'])
  await h.loader()
  h.advance(60_000)
  same(await neverThrows(h.loader), RULES_A, 'a failed refresh returns the stale rules')
  same(h.calls(), 2, 'the failed refresh called load once')
  h.advance(9_999)
  same(await neverThrows(h.loader), RULES_A, 'inside the backoff window the stale rules are returned')
  same(h.calls(), 2, 'inside the backoff window load is not called again')
  h.advance(1)
  same(await h.loader(), RULES_B, 'after the backoff window a refresh is tried again')
  same(h.calls(), 3, 'one more load after the backoff window')
}

// no cache plus failure is null
{
  const h = harness(['fail', 'ok-a'])
  same(await neverThrows(h.loader), null, 'with nothing cached a failure returns null')
  same(await neverThrows(h.loader), null, 'with nothing cached the backoff still returns null')
  same(h.calls(), 1, 'and does not call load inside the backoff window')
}

// a load that throws synchronously is a failure, not a throw
{
  const loader = createRulesLoader({
    ttlMs: 60_000,
    timeoutMs: 1000,
    failureBackoffMs: 10_000,
    load: (() => {
      throw new Error('sync boom')
    }) as never,
  })
  same(await neverThrows(loader), null, 'a synchronous throw from load returns null')
}

// a hung load is cut off by the timeout (real 20 ms timer)
{
  const h = harness(['hang'], 20)
  const started = Date.now()
  same(await neverThrows(h.loader), null, 'a hung load with nothing cached returns null after the timeout')
  check(Date.now() - started < 1000, 'the hung load was cut off promptly')
}
{
  const h = harness(['ok-a', 'hang'], 20)
  await h.loader()
  h.advance(60_000)
  same(await neverThrows(h.loader), RULES_A, 'a hung refresh returns the stale rules after the timeout')
}

// the load receives an abort signal that fires at the timeout
{
  let seen: AbortSignal | null = null
  const loader = createRulesLoader({
    ttlMs: 60_000,
    timeoutMs: 20,
    failureBackoffMs: 10_000,
    load: (signal) => {
      seen = signal
      return new Promise<MatchableRule[]>(() => {})
    },
  })
  await loader()
  // The signal's timer and the loader's cut-off timer share a duration; give the signal a moment.
  await new Promise((resolve) => setTimeout(resolve, 30))
  check((seen as AbortSignal | null)?.aborted === true, 'the signal passed to load is aborted at the timeout')
}

if (failed) {
  console.error('\nverifyRedirectRules: FAILED')
  process.exit(1)
}
console.log('\nverifyRedirectRules: all checks passed')
