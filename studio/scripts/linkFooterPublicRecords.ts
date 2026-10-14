/**
 * Points the footer menu's Public Records links (placeholders: `#`) at the public records archive.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/linkFooterPublicRecords.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkFooterPublicRecords.ts --with-user-token
 *
 * A page reference cannot carry a query string, so the category filters are relative `href` links
 * (`/public-records?category=<slug>`), using each `recordCategory` slug - the stable key. "Meetings"
 * has no single category (minutes and agendas are separate), so it links to the unfiltered archive
 * page by reference.
 *
 * What it overwrites: only a Public Records link in the "Footer Menu" that is still a `#`
 * placeholder; every other item is left as it is. It stops, writing nothing, if a category or the
 * archive page is missing, or if the menu has unpublished edits.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

/** Item label -> recordCategory slug, or null for the unfiltered archive page. */
const TARGETS: Record<string, string | null> = {
  Meetings: null,
  'Annual Reports': 'annual-reports',
  Policies: 'policies',
  'Establishment Documents': 'establishment-documents',
}

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}

async function main() {
  const archiveId = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "public-records" && !defined(parent) && !(_id in path("drafts.**"))][0]._id`,
  )
  const slugs = await client.fetch<string[]>(
    `*[_type == "recordCategory" && !(_id in path("drafts.**"))].slug.current`,
  )
  const problems = [
    ...(archiveId ? [] : ['the "public-records" page is not published']),
    ...Object.values(TARGETS)
      .filter((slug): slug is string => slug !== null && !slugs.includes(slug))
      .map((slug) => `no published record category "${slug}"`),
  ]
  if (problems.length) {
    console.error(`${problems.join('; ')}. Nothing was written.`)
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
    if (group.label !== 'Public Records') return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (!child.label || !(child.label in TARGETS) || !isPlaceholder) return child
        const slug = TARGETS[child.label]
        changes += 1
        console.log(
          `  ${DRY_RUN ? '[dry run] would link' : 'linking'} Public Records > ${child.label} -> ${
            slug ? `/public-records?category=${slug}` : '/public-records'
          }`,
        )
        return {
          ...child,
          link: slug
            ? {_type: 'link', linkType: 'href', href: `/public-records?category=${slug}`}
            : {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: archiveId}},
        }
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no Public Records placeholder links left.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
