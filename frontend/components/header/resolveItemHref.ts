import type {DereferencedLink} from '../../sanity/lib/types.ts'

/**
 * The href for a menu item, or null when it cannot be resolved - a link to a page that has
 * since been unpublished. Callers drop null items rather than rendering a dead link.
 *
 * Mirrors the resolution rule of `linkResolver` in sanity/lib/utils.ts. That module imports via
 * the `@/` alias, which plain Node (scripts/verifyMenuGroups.mts) cannot load, so the rule is
 * restated here. Keep the two in step.
 */
export function resolveItemHref(link: DereferencedLink | undefined): string | null {
  if (!link) return null
  const linkType = link.linkType ?? (link.href ? 'href' : undefined)
  if (linkType === 'href') return link.href || null
  if (linkType === 'page') return typeof link.page === 'string' && link.page ? `/${link.page}` : null
  return null
}
