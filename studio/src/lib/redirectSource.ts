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
 * File extensions the proxy matcher treats as static assets and never looks up (`config.matcher`
 * in `frontend/proxy.ts`). A source ending in one could never fire, so it is rejected. Mirrored
 * there as a regex literal; `frontend/scripts/verifyRedirectMatcher.mts` fails if the two differ.
 */
export const ASSET_EXTENSIONS: readonly string[] = [
  'js', 'mjs', 'css', 'map', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'bmp',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mov', 'mp3', 'txt', 'xml', 'json',
  'geojson', 'webmanifest',
]

/** The path of a request or source, the way the frontend matcher compares it. Mirrors `normalisePath`. */
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

/**
 * The comparison form of a source, equivalent to what the frontend matcher treats as one rule:
 * the path is percent-decoded, `//` collapsed, lowercased and stripped of a trailing slash (the
 * root stays `/`), and the query params are sorted, since the matcher ignores their order. The
 * stored value is never rewritten; every comparison goes through this.
 */
export function normaliseSource(source: string): string {
  const queryAt = source.indexOf('?')
  const path = normalisePath(queryAt === -1 ? source : source.slice(0, queryAt))
  if (queryAt === -1) return path
  const pairs = [...new URLSearchParams(source.slice(queryAt + 1))].map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
  )
  pairs.sort()
  return pairs.length ? `${path}?${pairs.join('&')}` : path
}

/** The lowercase extension of a path's last segment, or null. */
export function pathExtension(path: string): string | null {
  const last = path.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')
  return dot > 0 || (dot === 0 && last.length > 1) ? last.slice(dot + 1).toLowerCase() : null
}

/**
 * A destination typed as a URL must be a site path (one slash, not `//host`) or http(s): a path
 * without the leading slash resolves against the request path, and `javascript:` is not a redirect.
 * Mirrored by the matcher's `isSafeDestination` in `frontend/sanity/lib/redirectMatch.ts`.
 */
export function validateDestinationHref(href: string): true | string {
  const value = href.trim()
  if (/^\/(?![/\\])/.test(value) || /^https?:\/\/[^\s/]/i.test(value)) return true
  return 'Use a path starting with a single slash, like /new-page, or a full http(s):// URL.'
}

/** An editor-facing message when the source is malformed, otherwise `true`. */
export function validateSourceShape(source: string | undefined): true | string {
  if (!source || !source.trim()) return 'A source path is required.'
  if (!source.startsWith('/')) return 'The source must start with a slash, like /old-page.'
  if (source.includes('#')) {
    return 'The source cannot contain a #. Browsers never send the part after it to the server.'
  }
  if (source.includes('*')) return 'Wildcards are not supported. Add one redirect per path.'
  const queryAt = source.indexOf('?')
  const path = normalisePath(queryAt === -1 ? source : source.slice(0, queryAt))
  if (path === '/' && (queryAt === -1 || queryAt === source.length - 1)) {
    return 'A source of / would redirect the homepage. Add a query string (like /?p=123) or use another path.'
  }
  const extension = pathExtension(path)
  if (extension && ASSET_EXTENSIONS.includes(extension)) {
    return `Paths ending in .${extension} are served as static files and never reach the redirect lookup. Other endings, like .html or .php, work.`
  }
  const reserved = RESERVED_PREFIXES.find((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  if (reserved) return `${reserved} is reserved for the site itself and cannot be redirected.`
  return true
}
