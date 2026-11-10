import {revalidatePath} from 'next/cache'
import type {NextRequest} from 'next/server'
import {parseBody} from 'next-sanity/webhook'

/**
 * Sanity publish webhook. Without it a published edit reaches a visitor only when the cached page
 * regenerates (`revalidate = 3600`), because `<SanityLive>` refreshes only browsers that already
 * have the page open.
 *
 * Fails closed: with no `SANITY_REVALIDATE_SECRET` set, or a bad signature, nothing is purged.
 * Purges every route rather than mapping a document to its URLs: a page's address comes from its
 * parent chain, and menus, settings and referenced documents appear on many pages.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) return Response.json({error: 'not-configured'}, {status: 500})

  const {isValidSignature} = await parseBody(request, secret)
  if (!isValidSignature) return Response.json({error: 'invalid-signature'}, {status: 401})

  revalidatePath('/', 'layout')
  return Response.json({revalidated: true, at: new Date().toISOString()})
}
