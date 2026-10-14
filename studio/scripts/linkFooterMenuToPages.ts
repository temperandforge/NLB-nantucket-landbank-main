/**
 * Points the footer menu's `#` placeholder links at the pages that now exist.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/linkFooterMenuToPages.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkFooterMenuToPages.ts --with-user-token
 *
 * What it overwrites: only a link in the "Footer Menu" that is still a `#` placeholder and whose
 * group + label is listed in TARGETS below; every other item is left exactly as it is. Each change
 * is printed first. It stops, writing nothing, if a target page is not published (a link to a draft
 * is rejected by the API) or if the menu has unpublished edits (publish or discard them first, so
 * this does not overwrite them).
 *
 * Deliberately left alone: ACK Trails (no page yet) and the four Public Records items, which are
 * filters of the public records archive rather than pages.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

/** Group label -> item label -> page path (parent chain, then slug). */
const TARGETS: Record<string, Record<string, string[]>> = {
  'About Us': {
    Conservation: ['about-us', 'conservation'],
    Recreation: ['about-us', 'recreation'],
    Agriculture: ['about-us', 'agriculture'],
    Staff: ['about-us', 'staff'],
    History: ['about-us', 'history'],
    FAQs: ['about-us', 'faqs'],
  },
  Explore: {
    'Interactive Map': ['explore', 'map'],
    Properties: ['explore', 'properties'],
    'Plan Your Visit': ['explore', 'plan-visit'],
    'Request for Property Use': ['explore', 'request-for-property-use'],
  },
  'Our Work': {
    News: ['our-work', 'news'],
    Projects: ['our-work', 'projects'],
    Events: ['our-work', 'events'],
  },
  Other: {
    'Transfer Documents': ['transfer-documents'],
    'Connect With Us': ['connect-with-us'],
  },
}

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}
type PageRow = {_id: string; slug: string; parent?: string}

async function main() {
  // Published pages only, indexed by _id so a path can be walked up the parent chain.
  const pages = await client.fetch<PageRow[]>(
    `*[_type == "page" && !(_id in path("drafts.**"))]{_id, "slug": slug.current, "parent": parent._ref}`,
  )
  const byId = new Map(pages.map((p) => [p._id, p]))
  const pathOf = (page: PageRow): string => {
    const parent = page.parent ? byId.get(page.parent) : undefined
    return parent ? `${pathOf(parent)}/${page.slug}` : page.slug
  }
  const idByPath = new Map(pages.map((p) => [pathOf(p), p._id]))

  const missing = Object.values(TARGETS)
    .flatMap((items) => Object.values(items))
    .map((segments) => segments.join('/'))
    .filter((path) => !idByPath.has(path))
  if (missing.length) {
    console.error(`These pages are not published: ${missing.join(', ')}. Nothing was written.`)
    process.exit(1)
  }

  const menus = await client.fetch<Array<{_id: string; items?: Group[]}>>(
    `*[_type == "menu" && title == "Footer Menu"]{_id, items}`,
  )
  const draft = menus.find((m) => m._id.startsWith('drafts.'))
  const menu = menus.find((m) => !m._id.startsWith('drafts.'))
  if (!menu) {
    console.error('There is no published "Footer Menu". Nothing was written.')
    process.exit(1)
  }
  if (draft) {
    console.error('The Footer Menu has unpublished edits. Publish or discard them first. Nothing was written.')
    process.exit(1)
  }

  let changes = 0
  const items = (menu.items ?? []).map((group) => {
    const targets = group.label ? TARGETS[group.label] : undefined
    if (!targets) return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const segments = child.label ? targets[child.label] : undefined
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (!segments || !isPlaceholder) return child
        const path = segments.join('/')
        changes += 1
        console.log(`  ${DRY_RUN ? '[dry run] would link' : 'linking'} ${group.label} > ${child.label} -> /${path}`)
        return {
          ...child,
          link: {
            _type: 'link',
            linkType: 'page',
            page: {_type: 'reference', _ref: idByPath.get(path)},
          },
        }
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no placeholder links left to point at pages.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
