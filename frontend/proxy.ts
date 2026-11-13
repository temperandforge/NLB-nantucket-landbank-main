import {NextResponse, type NextRequest} from 'next/server'

import {client} from '@/sanity/lib/client'
import {redirectsQuery} from '@/sanity/lib/queries'
import type {RedirectRule} from '@/sanity/lib/types'
import {matchRedirect, type MatchableRule} from '@/sanity/lib/redirectMatch'
import {createRulesLoader} from '@/sanity/lib/redirectRules'

/**
 * The redirect rules, cached in memory per server instance. Next does not cache `fetch` in Proxy
 * (`next.revalidate` / `next.tags` have no effect here), so `createRulesLoader` does it: rules are
 * reused for 60 s, a refresh is cut off after 1.5 s, and a failed refresh serves the last good rules
 * and is not retried for 10 s. An edit to a redirect therefore takes up to 60 s per instance to apply.
 */
const getRules = createRulesLoader({
  load: async (signal) => {
    const rules = await client.fetch(redirectsQuery, {}, {signal})
    return rules.filter((rule): rule is RedirectRule & MatchableRule => typeof rule.source === 'string')
  },
  ttlMs: 60_000,
  timeoutMs: 1_500,
  failureBackoffMs: 10_000,
})

/**
 * Applies Studio-managed redirects before routing. GET and HEAD only.
 *
 * Fails open: any error, a Sanity outage or a slow response with no rules cached lets the request
 * through untouched.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next()

    const rules = await getRules()
    if (!rules) return NextResponse.next()

    const {pathname, search} = request.nextUrl
    const result = matchRedirect(rules, pathname, search)
    if (!result) return NextResponse.next()

    if (result.status === 410 || result.location === null) {
      return new NextResponse('Gone', {status: 410})
    }
    return NextResponse.redirect(new URL(result.location, request.url), result.status)
  } catch (error) {
    console.error('[proxy] redirect lookup failed, continuing', error)
    return NextResponse.next()
  }
}

export const config = {
  // Skip Next internals (`/_next/...`), the API routes (`/api` and `/api/...`) and requests for static
  // assets, recognised by a fixed list of file extensions. The `(?:/|$)` boundaries keep page paths
  // like `/apiary` or `/api-docs`. Other dotted paths (`/old-page.html`, `/x.php`) reach the proxy so
  // a redirect can match them. The extension list is mirrored in `ASSET_EXTENSIONS` in
  // `studio/src/lib/redirectSource.ts`, which rejects a source ending in one (it could never fire);
  // `scripts/verifyRedirectMatcher.mts` fails if the two drift. It must stay a string literal here:
  // Next reads `config` statically, so it cannot be built from a constant. See DECISIONS 2.8.
  matcher: [
    '/((?!_next(?:/|$)|api(?:/|$)|.*\\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|mov|mp3|txt|xml|json|geojson|webmanifest)$).*)',
  ],
}
