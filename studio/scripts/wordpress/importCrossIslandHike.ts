/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/news/cross-island-hike/ (page id
 * 1461), to a DRAFT `article` at /news/cross-island-hike.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importCrossIslandHike.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importCrossIslandHike.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with the slug `cross-island-hike`, published or draft,
 * is skipped and NEVER edited. --dry prints the plan and writes and uploads nothing.
 *
 * Decisions made because the source is a WordPress *page*, not a post:
 *  - date: WordPress's own publish date (2019-12-18) predates the 2026 content, so the page's last
 *    modified date (2026-08-21) is used. Change it in Studio if the editor prefers another.
 *  - image (required on an article): the page has no featured image, so the 2026 route map, which
 *    Yoast also uses as og:image, is the article image. It is therefore NOT repeated in the body.
 *  - the page's centred NLB logo (empty alt, linked to itself) is not carried over.
 *  - the H1 date line and the H2 intro become Heading 3 (the editor offers nothing higher).
 *  - the YouTube embed has no title in WordPress; the article's title is used for the play button.
 *  - no categories, no SEO overrides: the source has none (Yoast's description is empty).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'cross-island-hike'
const TITLE = 'Cross-Island Hike'
const DATE = '2026-08-21'
const MAP_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/2026-XIH-Map-scaled.jpg'
const MAP_ALT = 'Map of the 2026 Cross-Island Hike route'
const SHUTTLE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdScQyFn61PpXoqZjkxgWJfIQqPuh-a_M4GpYwghFUAXPOiVg/viewform?usp=publish-editor'
const VIDEO_URL = 'https://www.youtube.com/watch?v=W8_khY52Di0'

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

function block(key: string, style: 'normal' | 'h3', children: Span[], markDefs: object[] = []) {
  return {_type: 'block', _key: key, style, markDefs, children}
}

function buildBody() {
  return [
    block('hike-date', 'h3', [span('hike-date-s', 'Saturday, September 19th, 2026, Starting at 8:00am')]),
    block('hike-intro', 'h3', [
      span(
        'hike-intro-s',
        'Beginning by the beach at the end of Tom Nevers Fairground, we will be hiking across the island to Settler’s Landing on Madaket Harbor.',
      ),
    ]),
    block(
      'hike-shuttle',
      'normal',
      [
        span('hike-shuttle-a', 'Transportation', ['strong']),
        span('hike-shuttle-b', ' to the start of this year’s Cross-Island Hike will be available due to parking constraints. '),
        span('hike-shuttle-c', 'Please click here to sign up for the shuttle service using the online form and be on time.', [
          'strong',
          'hike-shuttle-link',
        ]),
        span(
          'hike-shuttle-d',
          ' Please note there will be NO shuttle service for the end of the hike. Please make arrangements to get back to your car from the end of your planned hike (e.g. Uber, taxi, start early and travel with a friend and leave a car at the end, etc). If you choose to drive, parking is limited so carpooling is encouraged.',
        ),
      ],
      [{_type: 'link', _key: 'hike-shuttle-link', linkType: 'href', href: SHUTTLE_URL, openInNewTab: true}],
    ),
    {_type: 'divider', _key: 'hike-divider', style: 'full'},
    {_type: 'videoEmbed', _key: 'hike-video', url: VIDEO_URL, title: TITLE},
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
  console.log(`Plan: draft article "${TITLE}" (/news/${SLUG}), ${DATE}, ${body.length} body blocks, image ${MAP_URL}`)
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const response = await fetch(MAP_URL)
  if (!response.ok) throw new Error(`Could not download ${MAP_URL}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: '2026-XIH-Map.jpg',
  })

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: MAP_ALT},
    body,
  } as never)
  console.log(`+ created ${created._id} (image ${asset._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
