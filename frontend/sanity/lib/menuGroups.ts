/**
 * Splits a dropdown's links into headed columns.
 *
 * Consecutive links sharing a `group` string form one column under that heading; a link with no
 * (or a blank) group sits in a headless column. Order is the authored order, so interleaved
 * headings stay separate rather than being merged behind the editor's back. Dependency-free so
 * scripts/verifyMenuGroups.mts can import it directly.
 */

export type MenuLinkGroup<T> = {heading: string | null; links: T[]}

export function groupMenuLinks<T extends {group?: string | null}>(
  links: readonly T[],
): MenuLinkGroup<T>[] {
  const groups: MenuLinkGroup<T>[] = []
  for (const link of links) {
    const heading = link.group?.trim() || null
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) {
      last.links.push(link)
    } else {
      groups.push({heading, links: [link]})
    }
  }
  return groups
}
