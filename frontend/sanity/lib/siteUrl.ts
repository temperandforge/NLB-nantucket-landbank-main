/**
 * The site's one trusted origin, used wherever a URL must be absolute (canonical links, social
 * cards, structured data). Taken from Settings, then NEXT_PUBLIC_SITE_URL. Anything that is not an
 * absolute https URL is treated as missing, so callers omit the output rather than emit a
 * relative or wrong address.
 */
export function getSiteUrl(settings?: {siteUrl?: string | null} | null): string | null {
  for (const candidate of [settings?.siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    const origin = toOrigin(candidate)
    if (origin) return origin
  }
  return null
}

function toOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/** `path` is a site-relative path beginning with `/`; returns null when there is no origin. */
export function absoluteUrl(path: string, origin: string | null): string | null {
  if (!origin) return null
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
