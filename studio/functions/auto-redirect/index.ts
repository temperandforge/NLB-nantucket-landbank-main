import {documentEventHandler} from '@sanity/functions'
import {createClient, type SanityClient} from '@sanity/client'

import {MAX_PAGE_DEPTH} from '../../src/lib/pageHierarchy'
import {
  diffPagePaths,
  planRedirectWrites,
  type DescendantRef,
  type ExistingRedirect,
  type PageState,
} from '../../src/lib/redirectDiff'

/**
 * Writes redirects when a published page is renamed or moved. Creates `redirect` documents (and
 * disables any that now shadow a live page); never touches pages. Runs once per publish, so a
 * missed run leaves a missing redirect with nothing flagging it.
 *
 * Every query takes its values as GROQ $params; nothing is interpolated into a query string.
 */

/** What the blueprint's projection delivers. `before` is null on a page's first publish. */
export type PageSnapshot = {slug: string | null; parentId: string | null; pathOnly: boolean}
export type AutoRedirectEvent = {id: string; before: PageSnapshot | null; after: PageSnapshot}

/** The slice of the client the handler uses, so a stub can stand in for it. */
export type RedirectClient = Pick<SanityClient, 'fetch' | 'transaction'>

type PageRow = {slug: string | null; parentId: string | null}
type ChildRow = {_id: string; slug: string | null; pathOnly: boolean; parentId: string}

/**
 * Ancestor slugs, outermost first, for a page whose parent is `parentId`. Published documents
 * only. Returns null when the chain cannot be resolved (a parent is unpublished, has no slug, or
 * the chain is deeper than the hierarchy allows): the path would be wrong, so the caller skips.
 */
async function fetchAncestors(
  client: RedirectClient,
  parentId: string | null,
): Promise<string[] | null> {
  const slugs: string[] = []
  let id = parentId
  // At most MAX_PAGE_DEPTH - 1 ancestors; the page's own slug is the last segment.
  for (let depth = 0; id; depth++) {
    if (depth >= MAX_PAGE_DEPTH - 1) return null
    const row = await client.fetch<PageRow | null>(
      `*[_type == "page" && _id == $id][0]{"slug": slug.current, "parentId": parent._ref}`,
      {id},
    )
    if (!row?.slug) return null
    slugs.unshift(row.slug)
    id = row.parentId
  }
  return slugs
}

/** Published descendants, level by level, each with the slugs from the page's child down to itself. */
async function fetchDescendants(client: RedirectClient, pageId: string): Promise<DescendantRef[]> {
  const found: DescendantRef[] = []
  const seen = new Set<string>([pageId])
  let level = new Map<string, string[]>([[pageId, []]])

  for (let depth = 1; depth < MAX_PAGE_DEPTH && level.size > 0; depth++) {
    const rows = await client.fetch<ChildRow[]>(
      `*[_type == "page" && parent._ref in $parentIds]{
        _id, "slug": slug.current, "pathOnly": coalesce(pathOnly, false), "parentId": parent._ref
      }`,
      {parentIds: [...level.keys()]},
    )
    const next = new Map<string, string[]>()
    for (const row of rows) {
      if (!row.slug || seen.has(row._id)) continue
      seen.add(row._id)
      const belowSlugs = [...(level.get(row.parentId) ?? []), row.slug]
      found.push({id: row._id, pathOnly: row.pathOnly, belowSlugs})
      next.set(row._id, belowSlugs)
    }
    level = next
  }
  return found
}

/** ENABLED redirects only: planRedirectWrites treats every one it is given as live. */
const fetchExistingRedirects = (client: RedirectClient) =>
  client.fetch<ExistingRedirect[]>(
    `*[_type == "redirect" && coalesce(enabled, true) == true]{"id": _id, source}`,
  )

async function toState(client: RedirectClient, snapshot: PageSnapshot): Promise<PageState | null> {
  if (!snapshot.slug) return null
  const ancestors = await fetchAncestors(client, snapshot.parentId)
  return ancestors && {slug: snapshot.slug, pathOnly: snapshot.pathOnly, ancestors}
}

/**
 * The whole job, separated from the Functions runtime so a stub client can exercise it. Returns
 * what it wrote.
 */
export async function applyAutoRedirects(
  event: AutoRedirectEvent,
  client: RedirectClient,
  log: (...args: unknown[]) => void = console.log,
): Promise<{created: number; disabled: number}> {
  const none = {created: 0, disabled: 0}
  const after = await toState(client, event.after)
  const before = event.before ? await toState(client, event.before) : null
  if (!after || (event.before && !before)) {
    log(`auto-redirect: skipped ${event.id}: its parent chain could not be resolved`)
    return none
  }

  const descendants = await fetchDescendants(client, event.id)
  const changes = diffPagePaths({pageId: event.id, before, after, descendants})
  const existing = await fetchExistingRedirects(client)
  const {create, disable} = planRedirectWrites(changes, existing)
  log('auto-redirect: plan', JSON.stringify({page: event.id, changes, create, disable}))

  if (create.length === 0 && disable.length === 0) {
    log(`auto-redirect: nothing to write for ${event.id}`)
    return none
  }

  const tx = client.transaction()
  for (const {source, pageId} of create) {
    tx.create({
      _type: 'redirect',
      source,
      origin: 'auto',
      statusCode: 301,
      passQuery: true,
      enabled: true,
      destination: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: pageId}},
    })
  }
  for (const id of disable) tx.patch(id, {set: {enabled: false}})
  await tx.commit()

  log(`auto-redirect: created ${create.length}, disabled ${disable.length} for ${event.id}`)
  return {created: create.length, disabled: disable.length}
}

export const handler = documentEventHandler<AutoRedirectEvent>(async ({context, event}) => {
  const client = createClient({...context.clientOptions, useCdn: false, apiVersion: '2025-05-08'})
  await applyAutoRedirects(event.data, client)
})
