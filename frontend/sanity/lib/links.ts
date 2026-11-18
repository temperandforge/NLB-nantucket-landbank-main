/**
 * True for a site-relative path (`/x`, `/x?y=1#z`) that next/link can navigate client-side.
 * False for in-page anchors, `mailto:`/`tel:`, absolute URLs and protocol-relative `//host`.
 * Pure, with no React import, so scripts/verifyLinks.mts can load it.
 */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')
}

/**
 * The href for a page's resolved `path` (what the `link` fragment returns as `page`). The landing
 * page comes back as `/` and maps to the root; any other path gets its leading slash.
 */
export function pageHref(path: string): string {
  return path === '/' ? '/' : `/${path}`
}
