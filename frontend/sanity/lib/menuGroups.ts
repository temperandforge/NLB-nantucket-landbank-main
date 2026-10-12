/**
 * Splits a dropdown's links into headed columns.
 *
 * Consecutive links sharing a `group` string form one column under that heading; a link with no
 * (or a blank) group sits in a headless column. Order is the authored order, so interleaved
 * headings stay separate rather than being merged behind the editor's back. Imported directly by
 * scripts/verifyMenuGroups.mts.
 *
 * Headings are stega-cleaned before comparing: in Presentation every string carries an invisible,
 * per-field suffix, so without this each link's heading differs and none of them group.
 */
import {stegaClean} from 'next-sanity'

export type MenuLinkGroup<T> = {heading: string | null; links: T[]}

export function groupMenuLinks<T extends {group?: string | null}>(
  links: readonly T[],
): MenuLinkGroup<T>[] {
  const groups: MenuLinkGroup<T>[] = []
  for (const link of links) {
    const heading = (link.group ? stegaClean(link.group).trim() : '') || null
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) {
      last.links.push(link)
    } else {
      groups.push({heading, links: [link]})
    }
  }
  return groups
}
