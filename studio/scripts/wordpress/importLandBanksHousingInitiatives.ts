/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/land-banks-housing-initiatives/ to a
 * DRAFT `article` at /news/land-banks-housing-initiatives.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importLandBanksHousingInitiatives.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importLandBanksHousingInitiatives.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan and writes and uploads nothing.
 *
 * Decisions:
 *  - date: the original publish date (2016-02-01). WordPress also shows 2016-06-03, not used.
 *  - image (required on an article): the post's only image is the article image, so it is NOT
 *    repeated in the body.
 *  - categories: the post is filed under News only, which is the section, not a `newsCategory`.
 *  - the two PDF links are kept exactly as in the source: http:// URLs on the Constant Contact CDN
 *    (files.ctctcdn.com), not files on this site. They are not downloaded or re-hosted.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'land-banks-housing-initiatives'
const TITLE = 'Land Bank’s Housing Initiatives'
const DATE = '2016-02-01'
const IMAGE_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/properteis-marker.jpg'
const IMAGE_ALT = 'Nantucket Land Bank Properties Marker'
const TOWN_MEETING_URL = 'http://files.ctctcdn.com/59da61a5501/43444f9b-5b29-4e2d-83cd-9c8309f57f39.pdf'
const POLICY_URL = 'http://files.ctctcdn.com/59da61a5501/3051ed6c-be64-4613-b63e-e1a931dd89de.pdf'

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

function linkParagraph(key: string, before: string, label: string, href: string, after: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [{_type: 'link', _key: `${key}-link`, linkType: 'href', href, openInNewTab: true}],
    children: [span(`${key}-a`, before), span(`${key}-b`, label, [`${key}-link`]), span(`${key}-c`, after)],
  }
}

function buildBody() {
  return [
    linkParagraph(
      'town-meeting',
      'Read the ',
      'Annual Town Meeting article (PDF)',
      TOWN_MEETING_URL,
      ' to adopt the “O” exemption for affordable housing.',
    ),
    linkParagraph('policy', 'Read the ', 'Nantucket Land Bank’s Affordable Housing Policy (PDF)', POLICY_URL, '.'),
  ]
}

async function main() {
  const existing = await client.fetch<Array<{_id: string}>>(`*[_type == "article" && slug.current == $slug]{_id}`, {
    slug: SLUG,
  })
  if (existing.length > 0) {
    console.log(`= exists, left as is: ${existing.map((e) => e._id).join(', ')}`)
    return
  }

  const body = buildBody()
  console.log(`Plan: draft article "${TITLE}" (/news/${SLUG}), ${DATE}, ${body.length} body blocks, image ${IMAGE_URL}`)
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const response = await fetch(IMAGE_URL)
  if (!response.ok) throw new Error(`Could not download ${IMAGE_URL}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: 'properteis-marker.jpg',
  })

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: IMAGE_ALT},
    body,
  } as never)
  console.log(`+ created ${created._id} (image ${asset._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
