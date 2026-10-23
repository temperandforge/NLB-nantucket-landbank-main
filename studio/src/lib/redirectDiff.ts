/**
 * Pure planning for auto-generated redirects: which page paths changed, and which redirect
 * documents to create or disable as a result. No I/O and no Sanity imports; the Sanity Function
 * fetches the data and applies the plan.
 *
 * A page URL is never derivable from a slug alone (docs/DECISIONS.md section 2), so every path
 * here is built from the full slug chain.
 */

import {buildPagePath, MAX_PAGE_DEPTH} from './pageHierarchy'
import {normaliseSource} from './redirectSource'

/** A page's place in the hierarchy. `ancestors` are ancestor slugs, outermost first. */
export type PageState = {slug: string; pathOnly: boolean; ancestors: string[]}

/**
 * A page below the changed one. `belowSlugs` runs from the changed page's child down to and
 * including this descendant's own slug.
 */
export type DescendantRef = {id: string; pathOnly: boolean; belowSlugs: string[]}

export type PagePathChange = {pageId: string; oldPath: string | null; newPath: string | null}

export type ExistingRedirect = {id: string; source: string}
export type NewRedirect = {source: string; pageId: string}

const segmentCount = (path: string) => path.split('/').length

/**
 * The routable path changes caused by a page being published, renamed or moved: the page itself
 * plus every routable descendant. `pathOnly` pages have no URL of their own, so they have a null
 * path, but they still contribute their slug to their descendants' paths.
 */
export function diffPagePaths(input: {
  pageId: string
  before: PageState | null
  after: PageState
  descendants: DescendantRef[]
}): PagePathChange[] {
  const {pageId, before, after, descendants} = input

  const pathOf = (state: PageState, below: string[]) =>
    buildPagePath([...state.ancestors, state.slug, ...below])

  const entries: {id: string; belowSlugs: string[]; ownPathOnly: (state: PageState) => boolean}[] = [
    {id: pageId, belowSlugs: [], ownPathOnly: (state) => state.pathOnly},
    ...descendants.map((d) => ({
      id: d.id,
      belowSlugs: d.belowSlugs,
      ownPathOnly: () => d.pathOnly,
    })),
  ]

  const changes: PagePathChange[] = []
  for (const entry of entries) {
    const oldPath =
      before && !entry.ownPathOnly(before) ? pathOf(before, entry.belowSlugs) : null
    const newPath = !entry.ownPathOnly(after) ? pathOf(after, entry.belowSlugs) : null
    if (oldPath === newPath) continue
    // A path deeper than the hierarchy allows cannot be routed; drop it rather than emit it.
    if (
      (oldPath && segmentCount(oldPath) > MAX_PAGE_DEPTH) ||
      (newPath && segmentCount(newPath) > MAX_PAGE_DEPTH)
    ) {
      continue
    }
    changes.push({pageId: entry.id, oldPath, newPath})
  }
  return changes
}

/**
 * Turn path changes into writes. Creates a redirect from each old path to its page unless one
 * already has that source; disables any existing redirect whose source is now a live page path,
 * since that redirect would otherwise shadow the page (rename and rename back, first publish).
 */
export function planRedirectWrites(
  changes: PagePathChange[],
  existing: ExistingRedirect[],
): {create: NewRedirect[]; disable: string[]} {
  const existingSources = new Set(existing.map((r) => normaliseSource(r.source)))

  const livePaths = new Set(
    changes.flatMap((c) => (c.newPath === null ? [] : [normaliseSource(`/${c.newPath}`)])),
  )

  const create: NewRedirect[] = []
  const created = new Set<string>()
  for (const {pageId, oldPath, newPath} of changes) {
    if (oldPath === null || newPath === null) continue
    const source = normaliseSource(`/${oldPath}`)
    // Never redirect from a path some page now occupies (swaps, self-moves, case-only renames).
    if (livePaths.has(source) || existingSources.has(source) || created.has(source)) continue
    created.add(source)
    create.push({source, pageId})
  }

  const disable = existing.filter((r) => livePaths.has(normaliseSource(r.source))).map((r) => r.id)

  return {create, disable}
}
