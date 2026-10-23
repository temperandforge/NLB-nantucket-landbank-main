/**
 * True for a site-relative path (`/x`, `/x?y=1#z`) that next/link can navigate client-side.
 * False for in-page anchors, `mailto:`/`tel:`, absolute URLs and protocol-relative `//host`.
 * Pure, with no React import, so scripts/verifyLinks.mts can load it.
 */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')
}
