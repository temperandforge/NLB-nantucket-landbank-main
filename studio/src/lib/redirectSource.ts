/**
 * Rules for a redirect's `source`, shared by the schema's validation and the auto-redirect function.
 * Pure: no Sanity imports.
 *
 * The frontend matcher (`frontend/sanity/lib/redirectMatch.ts`) cannot import across packages, so it
 * mirrors this normalisation rather than sharing it; change both together.
 */

/** Paths the site owns outright; a redirect from one of these could never fire or would break it. */
export const RESERVED_PREFIXES: readonly string[] = ['/_next', '/api', '/studio']

export const STATUS_CODES = [301, 302, 303, 307, 308, 410] as const

/**
 * The comparison form of a source: path lowercased, trailing slash stripped (the root stays `/`),
 * query string kept exactly as written. The stored value is never rewritten; every comparison
 * goes through this.
 */
export function normaliseSource(source: string): string {
  const queryAt = source.indexOf('?')
  const rawPath = queryAt === -1 ? source : source.slice(0, queryAt)
  const query = queryAt === -1 ? '' : source.slice(queryAt)
  const lowered = rawPath.toLowerCase()
  const path = lowered.length > 1 ? lowered.replace(/\/+$/, '') || '/' : lowered
  return path + query
}

/** An editor-facing message when the source is malformed, otherwise `true`. */
export function validateSourceShape(source: string | undefined): true | string {
  if (!source || !source.trim()) return 'A source path is required.'
  if (!source.startsWith('/')) return 'The source must start with a slash, like /old-page.'
  if (source.includes('#')) {
    return 'The source cannot contain a #. Browsers never send the part after it to the server.'
  }
  if (source.includes('*')) return 'Wildcards are not supported. Add one redirect per path.'
  const [path, query = ''] = normaliseSource(source).split('?')
  if (path === '/' && !query) {
    return 'A source of / would redirect the homepage. Add a query string (like /?p=123) or use another path.'
  }
  const reserved = RESERVED_PREFIXES.find((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  if (reserved) return `${reserved} is reserved for the site itself and cannot be redirected.`
  return true
}
