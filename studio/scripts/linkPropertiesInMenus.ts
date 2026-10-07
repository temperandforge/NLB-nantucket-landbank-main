/**
 * Points the footer menu's Properties link (a placeholder: `#`) at the Properties archive page.
 *
 * Run from the studio directory, after explore/properties is PUBLISHED:
 *   npx sanity exec scripts/linkPropertiesInMenus.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkPropertiesInMenus.ts --with-user-token
 *
 * What it overwrites: only a link under "Explore" in the "Footer Menu" that is labelled Properties
 * and is still a `#` placeholder; every other item is left exactly as it is. The change is printed
 * first. It stops, writing nothing, if the page is not published (a link to a draft is rejected by
 * the API) or if the menu has unpublished edits (publish or discard them first).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "explore" && !(_id in path("drafts.**"))][0]._id`,
  )
  const pageId = parent
    ? await client.fetch<string | null>(
        `*[_type == "page" && slug.current == "properties" && parent._ref == $parent && !(_id in path("drafts.**"))][0]._id`,
        {parent},
      )
    : null
  if (!pageId) {
    console.error('The page explore/properties is not published. Publish it first. Nothing was written.')
    process.exit(1)
  }

  const menus = await client.fetch<Array<{_id: string; items?: Group[]}>>(
    `*[_type == "menu" && title == "Footer Menu"]{_id, items}`,
  )
  const menu = menus.find((m) => !m._id.startsWith('drafts.'))
  if (!menu) {
    console.error('There is no published "Footer Menu". Nothing was written.')
    process.exit(1)
  }
  if (menus.some((m) => m._id.startsWith('drafts.'))) {
    console.error('The Footer Menu has unpublished edits. Publish or discard them first. Nothing was written.')
    process.exit(1)
  }

  let changes = 0
  const items = (menu.items ?? []).map((group) => {
    if (group.label !== 'Explore') return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (child.label !== 'Properties' || !isPlaceholder) return child
        changes += 1
        console.log(`  ${DRY_RUN ? '[dry run] would link' : 'linking'} Explore > Properties -> explore/properties`)
        return {...child, link: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: pageId}}}
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no Properties placeholder link under Explore.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
