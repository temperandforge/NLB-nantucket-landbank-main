/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/nantucket-housing-crisis/ to a
 * DRAFT `article` at /news/nantucket-housing-crisis.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importNantucketHousingCrisis.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importNantucketHousingCrisis.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan and writes and uploads nothing.
 *
 * Decisions:
 *  - date: the original publish date (2015-12-11). WordPress also shows 2016-02-01, not used.
 *  - image (required on an article): the post's only image is the article image, so it is NOT
 *    repeated in the body. Its source filename is `demo-map-image.jpg` and its alt is "Hinsdale Park
 *    property map", which looks like a placeholder that was never replaced; the editor should check it.
 *  - categories: the post is filed under News only, which is the section, not a `newsCategory`.
 *  - the body is verbatim, including the source's missing space in "housing,the".
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'nantucket-housing-crisis'
const TITLE = 'Nantucket Housing Crisis'
const DATE = '2015-12-11'
const IMAGE_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/demo-map-image.jpg'
const IMAGE_ALT = 'Hinsdale Park property map'
const EMAIL = 'jbell@nantucketlandbank.org'

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

function block(key: string, children: Span[], extra: object = {}, markDefs: object[] = []) {
  return {_type: 'block', _key: key, style: 'normal', markDefs, children, ...extra}
}

const bullet = (key: string, label: string, text: string) =>
  block(key, [span(`${key}-a`, label, ['strong']), span(`${key}-b`, text)], {listItem: 'bullet', level: 1})

function buildBody() {
  return [
    block('intro', [
      span(
        'intro-s',
        'In response to the recent concern raised by many in the community regarding lack of affordable housing,the Land Bank is working on the following initiatives:',
      ),
    ]),
    bullet(
      'policy',
      'Adoption of an Affordable Housing Policy:',
      ' The Commission has adopted an affordable housing policy similar to the one created by the Martha’s Vineyard Land Bank. It states, among other things, that the Land Bank will not target land suitable for affordable housing, and further, that prior to acquisition, future properties will be assessed to see if a joint purchase with an affordable housing agency makes sense.',
    ),
    bullet(
      'm-exemption',
      'First-time Homeowners “M” Exemption:',
      ' Staff will be recommending raising the first-time homeowner exemption from $400,000 to $500,000 effective January 1, 2016.',
    ),
    bullet(
      'o-exemption',
      'New “O” Exemption:',
      ' The Commission will be sponsoring a warrant article at the 2016 Annual Town Meeting to add a new exemption to the Land Bank Act that would make sales of permanently restricted affordable properties exempt from the Land Bank’s 2% fee.',
    ),
    block(
      'surplus',
      [
        span('surplus-a', 'Surplus Building Use Program:', ['strong']),
        span(
          'surplus-b',
          ' We are looking into ways to provide incentives to relocate surplus Land Bank houses that would otherwise get demolished. We maintain a list of individuals interested in such houses. If you would like to be added to the surplus housing list, please email ',
        ),
        span('surplus-c', EMAIL, ['surplus-link']),
        span('surplus-d', '.'),
      ],
      {listItem: 'bullet', level: 1},
      [{_type: 'link', _key: 'surplus-link', linkType: 'href', href: `mailto:${EMAIL}`}],
    ),
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
    filename: 'demo-map-image.jpg',
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
