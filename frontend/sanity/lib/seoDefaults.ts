import {toPlainText} from 'next-sanity'

import {sanityFetch} from '@/sanity/lib/live'
import {settingsQuery} from '@/sanity/lib/queries'
import type {SeoDefaults} from '@/sanity/lib/seo'
import {getSiteUrl} from '@/sanity/lib/siteUrl'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

/** The social image for a page: its own `seo.image` when one is set, else the document's image. */
export function resolveSeoImage(
  seo: {image?: {asset?: unknown} | null} | null | undefined,
  documentImage?: Parameters<typeof resolveOpenGraphImage>[0],
) {
  return resolveOpenGraphImage((seo?.image?.asset ? seo.image : documentImage) as Parameters<typeof resolveOpenGraphImage>[0]) ?? null
}

/**
 * The site-wide fallbacks every route's metadata falls back to, read from Settings. Fetched with
 * stega off (metadata never carries it) and never throws: a failed fetch gives no defaults, and
 * the route's own values stand.
 */
export async function getSeoDefaults(): Promise<SeoDefaults> {
  try {
    const {data: settings} = await sanityFetch({query: settingsQuery, stega: false})
    return {
      origin: getSiteUrl(settings),
      siteName: settings?.title,
      description: settings?.seo?.description || (settings?.description ? toPlainText(settings.description) : null),
      image: resolveOpenGraphImage(settings?.seo?.image?.asset ? settings.seo.image : settings?.ogImage) ?? null,
    }
  } catch {
    return {origin: getSiteUrl(null)}
  }
}
