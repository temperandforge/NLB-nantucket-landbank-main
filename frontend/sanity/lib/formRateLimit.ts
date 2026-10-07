/**
 * A best-effort per-key limiter for the submit route.
 *
 * The counters live in this process's memory. On serverless hosting each instance counts
 * separately, so this only slows one abuser; the honeypot and Turnstile are the real defences.
 * A shared store is tracked in https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/21
 * and can replace the Map without changing this interface.
 */

export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const MAX_KEYS = 5000

const hits = new Map<string, number[]>()

/** Records an attempt and returns true if the key has made too many within the window. */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > MAX_KEYS) {
    for (const [other, times] of hits) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) hits.delete(other)
    }
  }
  return false
}

export function resetRateLimit(): void {
  hits.clear()
}
