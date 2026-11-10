/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/play-time-construction-of-the-codfish-park-playground-is-almost-complete/
 * to a DRAFT `article` at /news/play-time-construction-of-the-codfish-park-playground-is-almost-complete.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importCodfishParkPlayground.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importCodfishParkPlayground.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan and writes and uploads nothing. The `recreation` news category must
 * already exist; the script stops without writing if it does not.
 *
 * Decisions:
 *  - date: the original publish date (2015-12-11). WordPress also shows a modified date of
 *    2023-07-31, which is not used.
 *  - image (required on an article): the post's only image, the playground entrance photo, is the
 *    article image and is therefore NOT repeated in the body.
 *  - categories: the post is filed under News > Recreation. `News` is the parent of the news
 *    section, not a `newsCategory` here, so only Recreation is referenced.
 *  - the donate link's href has a stray space in the source ("give-now/ named-funds"), which breaks
 *    it; the space is removed.
 *  - the body text is otherwise verbatim, including the source's "over whelming" (a typo). The
 *    double space in "local  landscape" is collapsed.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'play-time-construction-of-the-codfish-park-playground-is-almost-complete'
const TITLE = 'Play Time! Construction of the Codfish Park Playground is Almost Complete'
const DATE = '2015-12-11'
const CATEGORY_SLUG = 'recreation'
const IMAGE_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/Codfish-Park-Playground-1.jpg'
const IMAGE_ALT = 'Entrance at Codfish Park Playground'
const DONATE_URL = 'https://cfnan.org/give-now/named-funds/sconset-playground-and-park-fund'

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

function paragraph(key: string, children: Span[], markDefs: object[] = []) {
  return {_type: 'block', _key: key, style: 'normal', markDefs, children}
}

function buildBody() {
  return [
    paragraph('p1', [
      span(
        'p1-s',
        'At long last, the construction of a new playground and park at the Land Bank’s Codfish Park property is nearing completion. The play structures and paths have been installed and grass has been planted. In the spring, additional trees and plants will go in, as well as several benches, a picnic table, bike racks, and a drinking fountain.',
      ),
    ]),
    paragraph(
      'p2',
      [
        span(
          'p2-a',
          'After receiving full support from the Land Bank for the initial concept, a few dedicated Sconset mothers organized to form the ‘Sconset Playground and Park Committee and diligently began fundraising. The result was over whelming community support. Over 80 families and several island foundations contributed upwards of $160,000 for creation of the park. The committee is still actively fundraising to finish this project and anyone wishing to donate can ',
        ),
        span('p2-b', 'donate here', ['p2-link']),
        span('p2-c', '.'),
      ],
      [{_type: 'link', _key: 'p2-link', linkType: 'href', href: DONATE_URL, openInNewTab: true}],
    ),
    paragraph('p3', [
      span(
        'p3-s',
        'The park plan was developed through the collaborative efforts of local landscape designer, Julie Jordin of Garden Design Company and playground designer, Fred Martin of Environment Design. Their mutual goal was to create an integrated play space that elicited a connectedness to nature and fit within the historical context of Codfish Park. The park will act as a living classroom by exhibiting native plants that are pollinator-focused to attract bees, butterflies and birds. The wooden play structures have been custom-made and are nautically-themed. They are natural in color, modest in size, and grounded in a fall-zone made of sand all to fit within the ‘Sconset aesthetic and surrounding natural environment. Furthermore, the park is in full compliance with the Americans with Disabilities Act.',
      ),
    ]),
    paragraph('p4', [span('p4-s', 'We are delighted to announce that it will finally be open and ready for play this spring!')]),
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

  const category = await client.fetch<{_id: string} | null>(
    `*[_type == "newsCategory" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id}`,
    {slug: CATEGORY_SLUG},
  )
  if (!category) throw new Error(`No published newsCategory with slug "${CATEGORY_SLUG}"; nothing written.`)

  const body = buildBody()
  console.log(
    `Plan: draft article "${TITLE}" (/news/${SLUG}), ${DATE}, ${body.length} body blocks, category ${category._id}, image ${IMAGE_URL}`,
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const response = await fetch(IMAGE_URL)
  if (!response.ok) throw new Error(`Could not download ${IMAGE_URL}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: 'Codfish-Park-Playground-1.jpg',
  })

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: IMAGE_ALT},
    body,
    categories: [{_type: 'reference', _key: 'recreation', _ref: category._id}],
  } as never)
  console.log(`+ created ${created._id} (image ${asset._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
