export type ShareNetwork = 'facebook' | 'linkedin'

/**
 * The address that opens a network's share dialog for a page. The page's fragment is dropped (it
 * is a position on this page, not part of what is shared). An invalid address gives '' so a caller
 * can skip the share instead of opening a broken window.
 */
export function shareUrl(network: ShareNetwork, pageUrl: string): string {
  let page: URL
  try {
    page = new URL(pageUrl)
  } catch {
    return ''
  }
  page.hash = ''
  const encoded = encodeURIComponent(page.toString())
  return network === 'facebook'
    ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
    : `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
}
