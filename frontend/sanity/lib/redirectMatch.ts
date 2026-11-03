/**
 * Pure redirect matching. No runtime imports, so `scripts/verifyRedirectMatch.mts` can run it with
 * plain node. The source normalisation mirrors `normaliseSource` in
 * `studio/src/lib/redirectSource.ts` (cross-package, so it cannot be imported); change both
 * together.
 */

/** Status codes the matcher will act on. A rule with any other status is skipped. */
const SUPPORTED_STATUS = new Set([301, 302, 303, 307, 308, 410])

export type MatchableRule = {
  source: string
  statusCode: number
  passQuery: boolean
  /** A resolved site path or absolute URL; already null for 410 and for unroutable page destinations. */
  destination: string | null
}

export type RedirectResult = {status: number; location: string | null}

function normalisePath(raw: string): string {
  let path = raw
  try {
    path = decodeURIComponent(raw)
  } catch {
    // A malformed sequence falls back to the raw path.
  }
  path = path.replace(/\/{2,}/g, '/').toLowerCase()
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path || '/'
}

function splitQuery(value: string): {path: string; query: string} {
  const at = value.indexOf('?')
  return at === -1 ? {path: value, query: ''} : {path: value.slice(0, at), query: value.slice(at + 1)}
}

function paramsMatch(required: URLSearchParams, actual: URLSearchParams): boolean {
  for (const [key, value] of required) {
    if (!actual.getAll(key).includes(value)) return false
  }
  return true
}

function buildLocation(rule: MatchableRule, search: string): string {
  const destination = rule.destination as string
  if (!rule.passQuery) return destination
  const incoming = new URLSearchParams(search)
  if ([...incoming.keys()].length === 0) return destination
  const hashAt = destination.indexOf('#')
  const hash = hashAt === -1 ? '' : destination.slice(hashAt)
  const {path, query} = splitQuery(hashAt === -1 ? destination : destination.slice(0, hashAt))
  const merged = new URLSearchParams(query)
  for (const key of new Set(incoming.keys())) merged.delete(key)
  for (const [key, value] of incoming) merged.append(key, value)
  const out = merged.toString()
  return path + (out ? `?${out}` : '') + hash
}

/** The best redirect for a request, or null. More required query params beats fewer. */
export function matchRedirect(
  rules: MatchableRule[],
  pathname: string,
  search: string,
): RedirectResult | null {
  const path = normalisePath(pathname)
  const actual = new URLSearchParams(search)

  const candidates: {rule: MatchableRule; weight: number}[] = []
  for (const rule of rules) {
    if (!SUPPORTED_STATUS.has(rule.statusCode)) continue
    if (rule.statusCode !== 410 && !rule.destination) continue
    const {path: sourcePath, query} = splitQuery(rule.source)
    if (normalisePath(sourcePath) !== path) continue
    const required = new URLSearchParams(query)
    if (!paramsMatch(required, actual)) continue
    candidates.push({rule, weight: [...required.keys()].length})
  }
  candidates.sort((a, b) => b.weight - a.weight)

  for (const {rule} of candidates) {
    if (rule.statusCode === 410) return {status: 410, location: null}
    const location = buildLocation(rule, search)
    // A site-relative destination that lands on this same request again would loop.
    if (location.startsWith('/')) {
      const target = splitQuery(location.split('#')[0])
      const {query: sourceQuery} = splitQuery(rule.source)
      if (
        normalisePath(target.path) === path &&
        paramsMatch(new URLSearchParams(sourceQuery), new URLSearchParams(target.query))
      ) {
        continue
      }
    }
    return {status: rule.statusCode, location}
  }
  return null
}
