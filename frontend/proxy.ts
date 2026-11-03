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
  // Skip Next internals (`/_next/...`), the API routes (`/api` and `/api/...`) and anything with a
  // dot (static assets). The `(?:/|$)` boundaries keep page paths like `/apiary` or `/api-docs`.
  matcher: ['/((?!_next(?:/|$)|api(?:/|$)|.*\\..*).*)'],
}
