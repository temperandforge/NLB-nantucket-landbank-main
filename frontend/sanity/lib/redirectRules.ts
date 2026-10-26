/**
 * An in-memory cache for the redirect rules the proxy reads on every request. Pure apart from
 * timers: it imports only types, so `scripts/verifyRedirectRules.mts` can run it with plain node.
 *
 * Next does not cache `fetch` inside Proxy (`next.revalidate` and `next.tags` have no effect there),
 * so without this every page request would query Sanity and could hang on it. The cache lives per
 * server instance: an edit to a redirect takes up to `ttlMs` to apply on each instance.
 */
import type {MatchableRule} from './redirectMatch'

export type RulesLoaderOptions = {
  /** Fetches the rules. Should honour `signal`; it is also cut off at `timeoutMs` if it does not. */
  load: (signal: AbortSignal) => Promise<MatchableRule[]>
  /** How long a successful load is served without asking again. */
  ttlMs: number
  /** How long one refresh may take before it counts as failed. */
  timeoutMs: number
  /** After a failed refresh, how long to keep serving what we have before trying again. */
  failureBackoffMs: number
  now?: () => number
}

/**
 * Returns a function that resolves to the current rules, or null when none have ever loaded (the
 * caller then passes the request through). Fresh rules are returned without calling `load`; stale
 * rules trigger one refresh shared by all concurrent callers; a failed or timed-out refresh serves
 * the stale rules. Never rejects.
 */
export function createRulesLoader(options: RulesLoaderOptions): () => Promise<MatchableRule[] | null> {
  const {load, ttlMs, timeoutMs, failureBackoffMs} = options
  const now = options.now ?? Date.now

  let cached: {rules: MatchableRule[]; at: number} | null = null
  let failedAt: number | null = null
  let inFlight: Promise<MatchableRule[] | null> | null = null

  async function loadWithTimeout(): Promise<MatchableRule[]> {
    const signal = AbortSignal.timeout(timeoutMs)
    // A separate timer, because a load that ignores the signal must still be cut off, and the
    // signal's own timer is unref'd (it would not keep a lone script alive to fire).
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`redirect rules load timed out after ${timeoutMs} ms`)), timeoutMs)
    })
    try {
      const rules = await Promise.race([Promise.resolve().then(() => load(signal)), timedOut])
      if (!Array.isArray(rules)) throw new Error('redirect rules are not an array')
      return rules
    } finally {
      clearTimeout(timer)
    }
  }

  async function refresh(): Promise<MatchableRule[] | null> {
    try {
      const rules = await loadWithTimeout()
      cached = {rules, at: now()}
      failedAt = null
      return rules
    } catch (error) {
      failedAt = now()
      console.error('[redirects] rule refresh failed, serving the last good rules', error)
      return cached?.rules ?? null
    }
  }

  return async function getRules() {
    try {
      const t = now()
      if (cached && t - cached.at < ttlMs) return cached.rules
      if (failedAt !== null && t - failedAt < failureBackoffMs) return cached?.rules ?? null
      if (!inFlight) {
        inFlight = refresh().finally(() => {
          inFlight = null
        })
      }
      return await inFlight
    } catch {
      return cached?.rules ?? null
    }
  }
}
