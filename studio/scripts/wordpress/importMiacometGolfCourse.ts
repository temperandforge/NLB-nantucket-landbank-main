/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/miacomet-golf-course-past-present-and-future/
 * to a DRAFT `article` at /news/miacomet-golf-course-past-present-and-future.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importMiacometGolfCourse.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importMiacometGolfCourse.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan and writes and uploads nothing. The `recreation` news category must
 * already exist; the script stops without writing if it does not.
 *
 * Decisions:
 *  - date: the original publish date (2015-12-11). WordPress also shows 2023-07-31, which is not used.
 *  - image (required on an article): the post's only image is the article image, so it is NOT
 *    repeated in the body.
 *  - categories: filed under News > Recreation; `News` is the section, not a `newsCategory`.
 *  - the body is verbatim, including the source's typos ("use of it properties", "its’ anticipated").
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'miacomet-golf-course-past-present-and-future'
const TITLE = 'Miacomet Golf Course-Past, Present and Future'
const DATE = '2015-12-11'
const CATEGORY_SLUG = 'recreation'
const IMAGE_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/Miacomet_GolfCourse.jpg'
const IMAGE_ALT = 'Miacomet Golf Course'

const PARAGRAPHS = [
  'In 1985 the Land Bank purchased the original 9-hole 160 acre golf course property for $4.5 million in order to preserve it as a public golf course instead of it becoming a large subdivision. It was one of the Land Bank’s first purchases. Around that time the Land Bank Act was amended to allow for the recreational use of it properties. The course was built by area farmer Ralph Marble who eventually sold it to developers who in turn sold it to the Land Bank. Given the underlying zoning, the tract of land could have potentially been converted into approximately 300 house lots.',
  'After purchasing the 9-hole course the Land Bank leased the operation back to the Miacomet Golf Club which had been operating the course and still owned the clubhouse property. In the early 90’s the Land Bank started to plan for the expansion of the golf course from 9 holes to 18 holes and in 2003, the new 9 holes opened making Miacomet Golf Course the only public 18-hole course on the island. At that time the Land Bank took over operation of the course and hired a management company to oversee daily operations. In addition, an agreement was reached with the Miacomet Golf Club in which they deeded the clubhouse property to the Land Bank in exchange for grandfathering of their memberships. A few years later the Land Bank renovated the original nine holes to bring them up to the quality and links style of the newly added nine holes and today Miacomet Golf Course is a world class course.',
  'Miacomet Golf Course is a public golf course with membership also available. Currently the membership is capped at 400 memberships. The cap is in place to ensure that tee times are available to both members and non-members.',
  'Regarding the financial workings of Miacomet Golf Course, the Land Bank contracts management out to a golf management entity (currently Nantucket Golf Management, Inc.) which is responsible for all aspects of day to day operations while the Land Bank maintains oversight and decision making authority on all budgetary, policy and capital improvement matters. The management company gets paid a flat fee annually for its services while all revenue, operating expenses and capital improvements are the responsibility of the Land Bank. Since 1998 the Land Bank has funded both the course expansion to 18 holes including a new golf maintenance facility and the renovation of the original 9 holes plus several other capital improvements totaling over $11 million. The Land Bank borrowed $5.5 million of that $11 million and has been paying the principal while the golf operation pays the interest on that debt. Approximately $2.4 million from that borrowing remains outstanding.',
  'The operational goal has always been to provide a high quality golf experience at an affordable price while trying to get revenue to cover expenses so the business is self-sustaining. New England’s short summer season makes this a real challenge but in recent years the operation has been able to fund various improvements to the facility while still meeting annual expenses, including a golf practice area with bunkers and greens, a new starter building with bag storage below, driving range hitting station dividers, clubhouse/pro shop landscaping, cart path renovations and other improvements.',
  'Currently a strategic planning process is underway to look at the future of Miacomet Golf Course and its’ anticipated facility needs. Among those needs is the potential renovation, expansion or replacement of the existing clubhouse which was built by the volunteer efforts of its members in the 1970’s and is now in need of improvement.',
]

function buildBody() {
  return PARAGRAPHS.map((text, i) => ({
    _type: 'block',
    _key: `p${i + 1}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `p${i + 1}-s`, text, marks: []}],
  }))
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
    filename: 'Miacomet_GolfCourse.jpg',
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
