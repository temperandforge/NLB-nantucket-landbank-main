/**
 * Seeds the header menu from the Figma design, the `header` singleton, and a disabled `siteBanner`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedHeaderContent.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedHeaderContent.ts --with-user-token
 *
 * What it overwrites: nothing that already exists. The "Header Menu" is created only if absent;
 * pass --force to replace an existing Header Menu's items. The `header` and `siteBanner`
 * singletons are created only if absent (createIfNotExists), so Studio edits survive re-runs.
 *
 * Pages are never created. A link resolves to a real page reference only when a PUBLISHED page
 * with that path exists; otherwise it is a '#' placeholder and the script says so. The design's
 * typos ("Poperties", "Meting Agendas") are corrected here.
 */

import {getCliClient} from 'sanity/cli'

import {buildPagePath} from '../src/lib/pageHierarchy'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')
const MENU_TITLE = 'Header Menu'
const PLACEHOLDER_HREF = '#'

type Entry = {label: string; path?: string; group?: string}
type Top = {label: string; path?: string; children?: Entry[]}

/** Paths are the page's full URL path without the leading slash; omitted = placeholder. */
const MENU: Top[] = [
  {
    label: 'About Us',
    children: [
      {label: 'Conservation', group: 'Purpose', path: 'about-us/conservation'},
      {label: 'Recreation', group: 'Purpose', path: 'about-us/recreation'},
      {label: 'Agriculture', group: 'Purpose', path: 'about-us/agriculture'},
      {label: 'Commissioners', group: 'People'},
      {label: 'Staff', group: 'People', path: 'about-us/staff'},
      {label: 'History', group: 'Other', path: 'about-us/history'},
      {label: 'FAQs', group: 'Other', path: 'about-us/faqs'},
    ],
  },
  {
    label: 'Explore',
    children: [
      {label: 'Map', path: 'explore/interactive-map'},
      {label: 'Properties'},
      {label: 'Plan Your Visit', path: 'explore/plan-your-visit'},
      {label: 'Property Use Request', path: 'explore/request-for-property-use'},
      {label: 'ACK Trails'},
    ],
  },
  {
    label: 'Our Work',
    children: [{label: 'News'}, {label: 'Projects'}, {label: 'Events'}],
  },
  {
    label: 'Public Records',
    children: [
      {label: 'Meeting Minutes', path: 'public-records/meetings'},
      {label: 'Meeting Agendas', path: 'public-records/meetings'},
      {label: 'Annual Reports', path: 'public-records/annual-reports'},
      {label: 'Policies', path: 'public-records/policies'},
      {label: 'Establishment Documents', path: 'public-records/establishment-documents'},
    ],
  },
  {label: 'Transfer Documents', path: 'transfer-documents'},
  {label: 'Connect With Us', path: 'connect-with-us'},
]

function key(...parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type PageRow = {_id: string; slug?: string; parent?: string; grand?: string}

/** Published pages by full path, built with the same helper the Studio uses. */
async function publishedPagePaths(): Promise<Map<string, string>> {
  const rows = await client.fetch<PageRow[]>(
    `*[_type == "page" && !(_id in path("drafts.**")) && !coalesce(pathOnly, false)]{
      _id, "slug": slug.current, "parent": parent->slug.current, "grand": parent->parent->slug.current
    }`,
  )
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.slug) map.set(buildPagePath([row.grand, row.parent, row.slug]), row._id)
  }
  return map
}

function linkFor(path: string | undefined, pages: Map<string, string>, label: string) {
  const id = path ? pages.get(path) : undefined
  if (id) {
    console.log(`  page   ${label} -> /${path}`)
    return {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: id}}
  }
  console.log(`  #      ${label}${path ? ` (no published page at /${path})` : ''}`)
  return {_type: 'link', linkType: 'href', href: PLACEHOLDER_HREF}
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN - nothing will be written.\n' : '')
  const pages = await publishedPagePaths()
  console.log(`Found ${pages.size} published pages.\n`)

  const items = MENU.map((top) =>
    top.children
      ? {
          _type: 'menuGroup',
          _key: key(top.label),
          label: top.label,
          children: top.children.map((child) => ({
            _type: 'menuLink',
            _key: key(top.label, child.label),
            label: child.label,
            ...(child.group ? {group: child.group} : {}),
            link: linkFor(child.path, pages, `${top.label} / ${child.label}`),
          })),
        }
      : {
          _type: 'menuLink',
          _key: key(top.label),
          label: top.label,
          link: linkFor(top.path, pages, top.label),
        },
  )

  const existing = await client.fetch<{_id: string} | null>(
    `*[_type == "menu" && title == $title && !(_id in path("drafts.**"))][0]{_id}`,
    {title: MENU_TITLE},
  )

  if (DRY_RUN) {
    console.log(
      existing
        ? `\nWould ${FORCE ? 'REPLACE the items of' : 'keep'} the existing "${MENU_TITLE}" (${existing._id}).`
        : `\nWould create "${MENU_TITLE}".`,
    )
    console.log('Would create the header and siteBanner singletons if absent.')
    return
  }

  let menuId: string
  if (existing) {
    menuId = existing._id
    if (FORCE) {
      await client.patch(menuId).set({items}).commit()
      console.log(`\n= menu items replaced: ${MENU_TITLE} (${menuId})`)
    } else {
      console.log(`\n= menu exists, left alone: ${MENU_TITLE} (${menuId}) - use --force to replace`)
    }
  } else {
    const created = await client.create({_type: 'menu', title: MENU_TITLE, items})
    menuId = created._id
    console.log(`\n+ menu created: ${MENU_TITLE} (${menuId})`)
  }

  await client.createIfNotExists({
    _id: 'header',
    _type: 'header',
    mainMenu: {_type: 'reference', _ref: menuId},
  })
  await client.createIfNotExists({
    _id: 'siteBanner',
    _type: 'siteBanner',
    enabled: false,
    message: 'Welcome to the new website',
  })
  console.log('+ header and siteBanner singletons ensured (banner starts hidden)')
  console.log('\nDone. The Header Menu and Header are already published.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
