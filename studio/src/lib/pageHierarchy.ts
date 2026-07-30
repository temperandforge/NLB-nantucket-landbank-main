/**
 * Shared definitions for the page hierarchy, so the depth limit and the Presentation route
 * filters live in one place instead of being restated wherever they are needed.
 *
 * A page's URL is derived from its `parent` chain rather than authored - see
 * docs/DECISIONS.md section 2. GROQ cannot recurse, so the depth is fixed and every consumer
 * has to agree on it.
 *
 * Raising MAX_PAGE_DEPTH means updating three things together:
 *   1. PAGE_PRESENTATION_ROUTES below (one route per depth),
 *   2. the `pagePath` expression in frontend/sanity/lib/queries.ts,
 *   3. nothing else - page.ts and the verification script read the constant from here.
 */

/** Path segments a page URL may have, counting the page's own slug. */
export const MAX_PAGE_DEPTH = 3

/** True when a page is only a URL grouping segment and has no page of its own. */
const NOT_PATH_ONLY = `!coalesce(pathOnly, false)`

/**
 * Presentation "main document" filters, one per URL depth (URL -> document).
 *
 * Each is anchored with `!defined(...)` at the top of the parent chain so a deeper page cannot
 * also be matched by a shallower route, which would make two routes resolve the same document.
 */
export const PAGE_PRESENTATION_ROUTES = [
  {
    route: '/:s1',
    filter: `_type == "page" && ${NOT_PATH_ONLY}
             && slug.current == $s1
             && !defined(parent)`,
  },
  {
    route: '/:s1/:s2',
    filter: `_type == "page" && ${NOT_PATH_ONLY}
             && slug.current == $s2
             && parent->slug.current == $s1
             && !defined(parent->parent)`,
  },
  {
    route: '/:s1/:s2/:s3',
    filter: `_type == "page" && ${NOT_PATH_ONLY}
             && slug.current == $s3
             && parent->slug.current == $s2
             && parent->parent->slug.current == $s1`,
  },
] as const

/**
 * The fields a page's location resolver needs in order to assemble its URL. Kept here so the
 * projection and the depth limit stay in step.
 */
export const PAGE_LOCATION_SELECT = {
  name: 'name',
  slug: 'slug.current',
  pathOnly: 'pathOnly',
  parentSlug: 'parent->slug.current',
  grandparentSlug: 'parent->parent->slug.current',
} as const

/** Assemble a page URL from its own slug and its ancestors', nearest ancestor last. */
export function buildPagePath(segments: (string | null | undefined)[]): string {
  return segments.filter(Boolean).join('/')
}
