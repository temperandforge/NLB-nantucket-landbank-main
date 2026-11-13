/**
 * What an edit to a page does to URLs that already exist, so Studio can warn before the editor
 * publishes, unpublishes or deletes. Read-only: it fetches and describes, never writes.
 *
 * It reuses the planning the auto-redirect function runs (`redirectDiff.ts`), so the warning and the
 * redirects the function creates cannot disagree about which URLs change. The fetches mirror the
 * function's (`studio/functions/auto-redirect/index.ts`), which cannot import them without being
 * redeployed; keep the two in step. Every value goes in as a GROQ $param.
 */

import {MAX_PAGE_DEPTH} from './pageHierarchy'
import {
  diffPagePaths,
  planRedirectWrites,
  type DescendantRef,
  type ExistingRedirect,
  type PageState,
} from './redirectDiff'

/** The slice of a Sanity client these functions use, so a stub can stand in for it. */
export type FetchClient = {fetch: <T = unknown>(query: string, params?: Record<string, unknown>) => Promise<T>}

type PageRow = {slug: string | null; parentId: string | null}
type ChildRow = {_id: string; slug: string | null; pathOnly: boolean; parentId: string}

const MAX_LISTED = 5

/** Strip the drafts. prefix so a draft and its published version compare as the same document. */
export const publishedId = (id: string) => id.replace(/^drafts\./, '')

/** Ancestor slugs, outermost first; null when the chain cannot be resolved from published pages. */
async function fetchAncestors(client: FetchClient, parentId: string | null): Promise<string[] | null> {
  const slugs: string[] = []
  let id = parentId ? publishedId(parentId) : null
  for (let depth = 0; id; depth++) {
    if (depth >= MAX_PAGE_DEPTH - 1) return null
    const row: PageRow | null = await client.fetch<PageRow | null>(
      `*[_type == "page" && _id == $id][0]{"slug": slug.current, "parentId": parent._ref}`,
      {id},
    )
    if (!row?.slug) return null
    slugs.unshift(row.slug)
    id = row.parentId
  }
  return slugs
}

/** Published descendants, each with the slugs from the page's child down to itself. */
async function fetchDescendants(client: FetchClient, pageId: string): Promise<DescendantRef[]> {
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

const list = (paths: string[]) =>
  paths.slice(0, MAX_LISTED).join(', ') + (paths.length > MAX_LISTED ? `, and ${paths.length - MAX_LISTED} more` : '')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The edited document's fields the warning reads. */
export type PageDraft = {
  _id?: string
  slug?: {current?: string | null} | null
  parent?: {_ref?: string | null} | null
  pathOnly?: boolean | null
}

/**
 * A warning when publishing this draft would change the URL of the page or of anything below it,
 * otherwise null. Null too on a first publish (no old URL), or when the chain cannot be resolved.
 */
export async function describeRenameImpact(client: FetchClient, draft: PageDraft): Promise<string | null> {
  const pageId = publishedId(draft._id ?? '')
  const slug = draft.slug?.current
  if (!pageId || !slug) return null

  const published = await client.fetch<{slug: string | null; parentId: string | null; pathOnly: boolean} | null>(
    `*[_type == "page" && _id == $id][0]{"slug": slug.current, "parentId": parent._ref, "pathOnly": coalesce(pathOnly, false)}`,
    {id: pageId},
  )
  if (!published?.slug) return null

  const [beforeAncestors, afterAncestors] = await Promise.all([
    fetchAncestors(client, published.parentId),
    fetchAncestors(client, draft.parent?._ref ?? null),
  ])
  if (!beforeAncestors || !afterAncestors) return null
  const before: PageState = {slug: published.slug, pathOnly: published.pathOnly, ancestors: beforeAncestors}
  const after: PageState = {slug, pathOnly: Boolean(draft.pathOnly), ancestors: afterAncestors}

  const descendants = await fetchDescendants(client, pageId)
  const changes = diffPagePaths({pageId, before, after, descendants})
  if (changes.length === 0) return null

  const moved = changes.filter((c) => c.oldPath !== null && c.newPath !== null)
  const lost = changes.filter((c) => c.oldPath !== null && c.newPath === null)
  if (moved.length === 0 && lost.length === 0) return null

  const existing = await client.fetch<ExistingRedirect[]>(
    `*[_type == "redirect" && coalesce(enabled, true) == true]{"id": _id, source}`,
  )
  const planned = planRedirectWrites(changes, existing)
  const covered = moved.length - planned.create.length

  const parts: string[] = []
  if (moved.length > 0) {
    parts.push(
      `Publishing changes ${plural(moved.length, 'URL', 'URLs')}: ${list(
        moved.map((c) => `/${c.oldPath} → /${c.newPath}`),
      )}.`,
    )
    parts.push(
      covered > 0
        ? `Redirects from the old URLs are created automatically after you publish (${covered} already ${covered === 1 ? 'has one' : 'have one'}).`
        : 'Redirects from the old URLs are created automatically after you publish.',
    )
  }
  if (lost.length > 0) {
    parts.push(
      `${list(lost.map((c) => `/${c.oldPath}`))} will stop being ${lost.length === 1 ? 'a page' : 'pages'} and return 404. Add a redirect for ${lost.length === 1 ? 'it' : 'them'} if the address is public.`,
    )
  }
  return parts.join(' ')
}

type Incoming = {source: string; enabled: boolean}

/**
 * A warning for unpublishing or deleting a page: its own URL, the pages below it, and the redirects
 * that point at it. Null when nothing visible depends on it.
 */
export async function describeRemovalImpact(client: FetchClient, documentId: string): Promise<string | null> {
  const pageId = publishedId(documentId)
  const row = await client.fetch<{slug: string | null; parentId: string | null; pathOnly: boolean} | null>(
    `*[_type == "page" && _id == $id][0]{"slug": slug.current, "parentId": parent._ref, "pathOnly": coalesce(pathOnly, false)}`,
    {id: pageId},
  )
  // Never published: the live site has nothing to lose.
  if (!row?.slug) return null

  const ancestors = await fetchAncestors(client, row.parentId)
  const descendants = await fetchDescendants(client, pageId)
  const incoming = await client.fetch<Incoming[]>(
    `*[_type == "redirect" && destination.linkType == "page" && destination.page._ref == $id]{source, "enabled": coalesce(enabled, true)}`,
    {id: pageId},
  )

  const parts: string[] = []
  if (ancestors && !row.pathOnly) {
    parts.push(`/${[...ancestors, row.slug].join('/')} will return 404.`)
  }
  const routable = descendants.filter((d) => !d.pathOnly)
  if (ancestors && routable.length > 0) {
    const paths = routable.map((d) => `/${[...ancestors, row.slug, ...d.belowSlugs].join('/')}`)
    parts.push(
      `${plural(routable.length, 'page below it loses', 'pages below it lose')} its parent and its URL breaks: ${list(paths)}.`,
    )
  }
  const live = incoming.filter((r) => r.enabled)
  if (live.length > 0) {
    parts.push(
      `${plural(live.length, 'redirect points', 'redirects point')} here and will stop applying: ${list(live.map((r) => r.source))}.`,
    )
  }
  if (parts.length === 0) return null
  parts.push('Add a redirect to another page, or a 410 Gone, if the old address is public.')
  return parts.join(' ')
}
