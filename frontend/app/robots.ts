import type {MetadataRoute} from 'next'

import {getSeoDefaults} from '@/sanity/lib/seoDefaults'

/**
 * robots.txt. Crawl guidance, not access control: well-behaved crawlers honour it, abusive bots
 * ignore it, so rate limiting belongs at the edge.
 *
 * - `/search` is noindex but still a dynamic, Sanity-backed render per query, so crawlers are kept
 *   off it altogether.
 * - `/api/` holds the form, revalidate and draft-mode handlers; none is content.
 * - The map's filter parameters are a view of one page, whose canonical is the bare path, so
 *   crawlers are kept off the combinations. The pattern is `?` then the parameter anywhere in the
 *   query string (`*` is supported by the major crawlers).
 *
 * The sitemap is advertised only when an origin is configured: it must be absolute, and without
 * one the sitemap itself is empty (see sitemap.ts).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = (await getSeoDefaults()).origin
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/search', '/api/', '/*?*propertyType=', '/*?*resources='],
    },
    ...(origin && {sitemap: `${origin}/sitemap.xml`}),
  }
}
