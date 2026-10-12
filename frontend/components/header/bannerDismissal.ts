/**
 * Banner dismissal. A visitor's dismissal is remembered against a hash of the message, so
 * editing the message in the Studio shows the banner again. localStorage can throw or be empty
 * (private windows, blocked site data), so every access is guarded and the banner simply shows
 * again when storage is unavailable.
 */

const PREFIX = 'nlb-banner-dismissed:'

/** djb2 - small, stable and good enough for telling two short messages apart. */
export function bannerKey(message: string): string {
  const text = message.trim()
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  }
  return PREFIX + (hash >>> 0).toString(36)
}

export function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Storage unavailable: the dismissal lasts until the component unmounts.
  }
}
