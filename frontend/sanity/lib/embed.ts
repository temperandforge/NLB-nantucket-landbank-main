/**
 * The iframe address for an embed block, or null when it is not an allowed address. Only Google
 * Maps and Google Calendar embeds are accepted. The same list is in
 * studio/src/schemaTypes/objects/embed.ts, which cannot import this file; change both.
 */
const ALLOWED: Array<{host: string; pathPrefix: string}> = [
  {host: 'maps.google.com', pathPrefix: '/maps'},
  {host: 'www.google.com', pathPrefix: '/maps'},
  {host: 'calendar.google.com', pathPrefix: '/calendar/embed'},
]

export function embedSrc(address: string | null | undefined): string | null {
  if (!address) return null
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const ok = ALLOWED.some(({host, pathPrefix}) => url.hostname === host && url.pathname.startsWith(pathPrefix))
  return ok ? url.toString() : null
}
