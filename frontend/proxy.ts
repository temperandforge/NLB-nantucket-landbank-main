import {NextResponse, type NextRequest} from 'next/server'

import {client} from '@/sanity/lib/client'
import {redirectsQuery} from '@/sanity/lib/queries'
import type {RedirectRule} from '@/sanity/lib/types'
import {matchRedirect, type MatchableRule} from '@/sanity/lib/redirectMatch'

/**
 * Applies Studio-managed redirects before routing. Runs on the Node.js runtime, so the shared
 * Sanity client and its `next` fetch options work here. The rules are cached for 60 seconds and
 * tagged 'redirect' so a webhook can revalidate them on publish.
 *
 * Fails open: any error, including a Sanity outage, lets the request through untouched.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next()

    const rules = await client.fetch(redirectsQuery, {}, {next: {revalidate: 60, tags: ['redirect']}})
    const usable = rules.filter((rule): rule is RedirectRule & MatchableRule => typeof rule.source === 'string')

    const {pathname, search} = request.nextUrl
    const result = matchRedirect(usable, pathname, search)
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
  // Skip Next internals, the API routes and anything with a file extension (static assets).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
