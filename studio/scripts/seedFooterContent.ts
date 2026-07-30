/**
 * Seeds the footer content from the Figma design, plus the pages its menu links to.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedFooterContent.ts --with-user-token
 *
 * Idempotent. Pages and menus are matched on slug/title and reused if they already exist, so
 * re-running does not create duplicates. Sanity assigns their document ids - only the footer
 * singleton uses a fixed id, which is the one case where an explicit id is correct.
 *
 * NOTE: the footer singleton is written with createOrReplace, so re-running this script
 * discards any edits made to the footer in the Studio. Pages are never overwritten.
 *
 * Several links are deliberately '#' placeholders: the real relative paths are to be supplied
 * later. Those entries get no page created for them.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const PLACEHOLDER_HREF = '#'

type LinkSpec =
  /** A '#' placeholder - the real relative path comes later. No page is created. */
  | {kind: 'placeholder'}
  /** Links to a 'page' document, created if it does not exist yet. */
  | {kind: 'page'; slug: string}

type ItemSpec = {label: string; link: LinkSpec}
type GroupSpec = {label: string; children: ItemSpec[]}

const placeholder: LinkSpec = {kind: 'placeholder'}
const page = (slug: string): LinkSpec => ({kind: 'page', slug})

/**
 * The five footer navigation columns, in design order.
 *
 * Links under About Us, Explore and Public Records are nested beneath the section in the URL
 * ("/about-us/conservation"). The section itself is only a heading here - no page is created
 * for it, by design. Items under Other are top-level paths.
 */
const FOOTER_MENU: GroupSpec[] = [
  {
    label: 'About Us',
    children: [
      {label: 'Conservation', link: page('about-us/conservation')},
      {label: 'Recreation', link: page('about-us/recreation')},
      {label: 'Agriculture', link: page('about-us/agriculture')},
      {label: 'Staff', link: placeholder},
      {label: 'History', link: page('about-us/history')},
      {label: 'FAQs', link: placeholder},
    ],
  },
  {
    label: 'Explore',
    children: [
      {label: 'Interactive Map', link: page('explore/interactive-map')},
      {label: 'Properties', link: placeholder},
      {label: 'Plan Your Visit', link: page('explore/plan-your-visit')},
      {label: 'Request for Property Use', link: page('explore/request-for-property-use')},
      {label: 'ACK Trails', link: placeholder},
    ],
  },
  {
    label: 'Our Work',
    children: [
      {label: 'News', link: placeholder},
      {label: 'Projects', link: placeholder},
      {label: 'Events', link: placeholder},
    ],
  },
  {
    label: 'Public Records',
    children: [
      {label: 'Meetings', link: page('public-records/meetings')},
      {label: 'Annual Reports', link: page('public-records/annual-reports')},
      {label: 'Policies', link: page('public-records/policies')},
      {label: 'Establishment Documents', link: page('public-records/establishment-documents')},
    ],
  },
  {
    label: 'Other',
    children: [
      {label: 'Transfer Documents', link: page('transfer-documents')},
      {label: 'Connect With Us', link: page('connect-with-us')},
    ],
  },
]

/** Legal links beside the copyright. Both are placeholders for now. */
const LEGAL_MENU: ItemSpec[] = [
  {label: 'Cookie Settings', link: placeholder},
  {label: 'Privacy Policy', link: placeholder},
]

const FOOTER_MENU_TITLE = 'Footer Menu'
const LEGAL_MENU_TITLE = 'Legal Menu'

/** Stable array keys derived from the label, so re-runs don't churn the document history. */
function key(...parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function ensurePage(slug: string, name: string): Promise<string> {
  const existing = await client.fetch<{_id: string} | null>(
    `*[_type == "page" && slug.current == $slug][0]{_id}`,
    {slug},
  )
  if (existing?._id) {
    console.log(`  = page exists: ${slug}`)
    return existing._id
  }
  const created = await client.create({
    _type: 'page',
    name,
    slug: {_type: 'slug', current: slug},
    // 'heading' is required by the page schema.
    heading: name,
  })
  console.log(`  + page created: ${slug} (${created._id})`)
  return created._id
}

function linkValue(spec: LinkSpec, pageIds: Map<string, string>) {
  if (spec.kind === 'placeholder') {
    return {_type: 'link' as const, linkType: 'href' as const, href: PLACEHOLDER_HREF}
  }
  const id = pageIds.get(spec.slug)
  if (!id) throw new Error(`No page id resolved for slug "${spec.slug}"`)
  return {
    _type: 'link' as const,
    linkType: 'page' as const,
    page: {_type: 'reference' as const, _ref: id},
  }
}

async function upsertMenu(title: string, items: unknown[]): Promise<string> {
  const existing = await client.fetch<{_id: string} | null>(
    `*[_type == "menu" && title == $title][0]{_id}`,
    {title},
  )
  if (existing?._id) {
    await client.patch(existing._id).set({items}).commit()
    console.log(`  = menu updated: ${title} (${existing._id})`)
    return existing._id
  }
  const created = await client.create({_type: 'menu', title, items})
  console.log(`  + menu created: ${title} (${created._id})`)
  return created._id
}

async function main() {
  console.log('Resolving pages...')

  // Collect every page the menus need, deduped by slug.
  const pageSpecs = new Map<string, string>()
  for (const group of FOOTER_MENU) {
    for (const item of group.children) {
      if (item.link.kind === 'page') {
        pageSpecs.set(item.link.slug, item.label)
      }
    }
  }
  for (const item of LEGAL_MENU) {
    if (item.link.kind === 'page') {
      pageSpecs.set(item.link.slug, item.label)
    }
  }

  const pageIds = new Map<string, string>()
  for (const [slug, name] of pageSpecs) {
    pageIds.set(slug, await ensurePage(slug, name))
  }

  console.log('Writing menus...')

  const footerMenuItems = FOOTER_MENU.map((group) => ({
    _type: 'menuGroup',
    _key: key(group.label),
    label: group.label,
    children: group.children.map((child) => ({
      _type: 'menuLink',
      _key: key(group.label, child.label),
      label: child.label,
      link: linkValue(child.link, pageIds),
    })),
  }))

  const legalMenuItems = LEGAL_MENU.map((item) => ({
    _type: 'menuLink',
    _key: key(item.label),
    label: item.label,
    link: linkValue(item.link, pageIds),
  }))

  const footerMenuId = await upsertMenu(FOOTER_MENU_TITLE, footerMenuItems)
  const legalMenuId = await upsertMenu(LEGAL_MENU_TITLE, legalMenuItems)

  console.log('Writing footer singleton...')

  await client.createOrReplace({
    _id: 'footer',
    _type: 'footer',
    newsletterHeading: 'Stay up to date on what is happening on the island.',
    organizationName: 'Nantucket Islands Land Bank',
    infoColumns: [
      {
        _type: 'infoColumn',
        _key: 'contact',
        heading: 'Contact',
        lines: [
          {
            _type: 'infoLine',
            _key: 'phone',
            text: 'Phone: 508-228-7240',
            href: 'tel:+15082287240',
          },
          {_type: 'infoLine', _key: 'fax', text: 'FAX: 508-228-9369'},
          {
            _type: 'infoLine',
            _key: 'email',
            text: 'info@nantucketlandbank.org',
            href: 'mailto:info@nantucketlandbank.org',
          },
        ],
      },
      {
        _type: 'infoColumn',
        _key: 'address',
        heading: 'Address',
        lines: [
          {_type: 'infoLine', _key: 'street', text: '22 Broad Street Nantucket'},
          {_type: 'infoLine', _key: 'state', text: 'MA 02554'},
        ],
      },
      {
        _type: 'infoColumn',
        _key: 'office-hours',
        heading: 'Office Hours',
        lines: [
          {_type: 'infoLine', _key: 'days', text: 'Monday–Friday'},
          {_type: 'infoLine', _key: 'hours', text: '9 a.m.–12 p.m. and 1–4 p.m.'},
        ],
      },
    ],
    footerMenu: {_type: 'reference', _ref: footerMenuId},
    legalMenu: {_type: 'reference', _ref: legalMenuId},
    // Placeholder URLs - the real profile links still need to be supplied.
    socialLinks: [
      {_type: 'socialLink', _key: 'facebook', platform: 'facebook', url: PLACEHOLDER_HREF},
      {_type: 'socialLink', _key: 'instagram', platform: 'instagram', url: PLACEHOLDER_HREF},
      {_type: 'socialLink', _key: 'linkedin', platform: 'linkedin', url: PLACEHOLDER_HREF},
    ],
  })

  console.log('  + footer singleton written')
  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
