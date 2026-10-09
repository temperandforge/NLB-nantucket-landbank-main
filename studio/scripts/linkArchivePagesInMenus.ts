/**
 * Points the footer menu's Staff and FAQs links (placeholders: `#`) at the new archive pages.
 *
 * Run from the studio directory, after the three pages are PUBLISHED:
 *   npx sanity exec scripts/linkArchivePagesInMenus.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkArchivePagesInMenus.ts --with-user-token
 *
 * What it overwrites: only a link under "About Us" in the "Footer Menu" that is labelled Staff or
 * FAQs and is still a `#` placeholder; every other item is left exactly as it is. Each change is
 * printed first. It stops, writing nothing, if a target page is not published (a link to a draft is
 * rejected by the API) or if the menu has unpublished edits (publish or discard them first, so
 * this does not overwrite them).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const TARGETS: Array<{label: string; slug: string}> = [
  {label: 'Staff', slug: 'staff'},
  {label: 'FAQs', slug: 'faqs'},
]

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "about-us" && !(_id in path("drafts.**"))][0]._id`,
  )
  if (!parent) {
    console.error('The "about-us" page is not published. Nothing was written.')
    process.exit(1)
  }

  const pageIds = new Map<string, string>()
  for (const {slug} of TARGETS) {
    const id = await client.fetch<string | null>(
      `*[_type == "page" && slug.current == $slug && parent._ref == $parent && !(_id in path("drafts.**"))][0]._id`,
      {slug, parent},
    )
    if (!id) {
      console.error(`The page about-us/${slug} is not published. Publish it first. Nothing was written.`)
      process.exit(1)
    }
    pageIds.set(slug, id)
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
    if (group.label !== 'About Us') return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const target = TARGETS.find((t) => t.label === child.label)
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (!target || !isPlaceholder) return child
        changes += 1
        console.log(`  ${DRY_RUN ? '[dry run] would link' : 'linking'} About Us > ${child.label} -> about-us/${target.slug}`)
        return {
          ...child,
          link: {
            _type: 'link',
            linkType: 'page',
            page: {_type: 'reference', _ref: pageIds.get(target.slug)},
          },
        }
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no Staff or FAQs placeholder links under About Us.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
