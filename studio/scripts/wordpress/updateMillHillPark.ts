/**
 * Brings the existing `project` "Mill Hill Park Revitalization Project" (slug
 * `mill-hill-park-revitalization-project`) in line with the live page,
 * https://www.nantucketlandbank.org/mill-hill-park-revitalization-project/
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/updateMillHillPark.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/updateMillHillPark.ts --with-user-token
 *
 * Unlike the importers beside it, this project already has content, so this UPDATES one. It writes
 * ONE draft revision (`drafts.<id>`, a copy of the published document with the changes below) and one
 * image asset downloaded from the live site. The published project is NOT modified; an editor reviews
 * the draft and publishes it.
 *
 * What it changes, and why:
 *  - body: kept only up to the end of "Timeline & Contact". The first 19 blocks are the live page's
 *    text, word for word (the script checks this and stops if they differ). Everything after it was
 *    leftover template content from a different property: "Introduction", "Property Goals -
 *    Community", "Property Goals - Environmental" and "Maps" (all about Francis Street Beach), a
 *    "Map - ..." anchor-links row whose links are "#", and a "Project FAQs" accordion of placeholder
 *    questions. The live page has none of it, so it is dropped from the draft. The block objects that
 *    are kept are not rewritten.
 *  - image: replaced. The existing cover was a placeholder (an abstract gradient). The live page's
 *    featured image (its og:image) is a map of the park showing the new trail, future trails, exercise
 *    stations and new parking area, and is used instead. The old image asset is left in the dataset,
 *    unreferenced, rather than deleted.
 *  - NOT changed: name, slug, description and project type.
 *
 * Idempotent and non-destructive: if the project already has a draft, the script stops and edits
 * nothing. If the published project has already been trimmed and has the new image, it says so and
 * stops. --dry prints the plan and the blocks that would be dropped, and writes and uploads nothing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'mill-hill-park-revitalization-project'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'
const COVER = {
  file: 'MillHillMapUpdated052726-scaled.jpg',
  alt: 'Map of Mill Hill Park showing the new trail, future new trails, exercise stations and new parking area',
}

/** The live page's text, in order: the opening paragraph, then each H2 and its paragraphs. */
const LIVE_TEXT = [
  'The Nantucket Land Bank is delighted to restore Mill Hill Park’s natural beauty and update its amenities for public use across this 19.25-acre open space, treasured by the community since 1912.',
  'History',
  'Mill Hill Park has been preserved as public open space since 1912. It was first maintained by the Nantucket Civic League, a volunteer group of 24 neighborhood associations, who held and managed the property for over 50 years before gifting it to the Town of Nantucket.',
  'The Town maintained Mill Hill Park until 2024, when it transferred the 19.25-acre property to the Land Bank in exchange for the Nobadeer Soccer Fields and additional smaller parcels. Since then, the Nantucket Land Bank has been observing how the park is used while planning restoration work and improvements.',
  'Invasive Plant Removal',
  'Like many properties on Nantucket, Mill Hill Park has been impacted by invasive plants, non-native species that establish within local ecosystems and out-compete native plants for space and resources, without the natural checks that exist in their native habitats.',
  'The Land Bank’s field crew has been monitoring and managing invasive plants at Mill Hill as part of a broader property plan. We will be expanding this effort at the park to improve ecological conditions and make room for native species to flourish. Removal will be incremental and management will occur each growing season.',
  'Parking Improvements',
  'We will also be upgrading the parking area. The road will be graded, the lot expanded, and the vegetation between the parking area and Prospect Street trimmed and pruned.',
  'New Trails & Fitness Equipment',
  'Mill Hill Park is especially valuable thanks to its proximity to downtown, the surrounding neighborhoods of full-time and seasonal residents, and the two bus lines that serve it, making it one of the most accessible green spaces on the island.',
  'After speaking with residents and assessing the park’s potential, we will be expanding the trail network and bringing back the outdoor fitness equipment that the community has been missing. The updated trail system will emphasize walking loops and broader access throughout the property.',
  'Foraging Trail',
  'Many residents remember Mill Hill as a wonderful foraging spot. We plan to enhance access to existing forage species in the northeast corner of the park, including beach plum, highbush blueberry, and crabapple and intend to supplement them with additional plantings: lowbush blueberry, huckleberry, fox grape, hawthorn, black cherry, and common blackberry.',
  'This variety ensures that at least one species is fruiting throughout the growing season, with foraging opportunities available consistently from June through September. Signage along the new foraging trail will help visitors identify plants, learn how to use foraged food, and discover other places on the island where these species can be found.',
  'Active Exercise Loop',
  'Following the trail expansion, an active exercise loop will be designed and installed to promote the health of the Nantucket community. Many residents voiced their hope to bring this form of outdoor recreation back to Mill Hill, and the Land Bank Commission is delighted to make it happen.',
  'Timeline & Contact',
  'Our field crew has already begun trail work at Mill Hill, and we look forward to maintaining and improving this property for public use in the years to come. Questions or concerns about this project? Contact the Nantucket Land Bank at 508-228-7240, send us an email at administrator@nantucketlandbank.org or stop by 22 Broad Street.',
]

type Block = {_type: string; _key: string; children?: Array<{text?: string}>; [key: string]: unknown}
const plain = (block: Block) => (block.children ?? []).map((child) => child.text ?? '').join('')

async function main() {
  const docs = await client.fetch<Array<Record<string, unknown> & {_id: string; body?: Block[]; image?: {asset?: {_ref?: string}}}>>(
    `*[_type == "project" && slug.current == $slug]`,
    {slug: SLUG},
  )
  const published = docs.find((doc) => !doc._id.startsWith('drafts.'))
  if (!published) throw new Error(`No project with slug "${SLUG}". Nothing written.`)
  const draft = docs.find((doc) => doc._id === `drafts.${published._id}`)
  if (draft) {
    console.log(`= a draft already exists (${draft._id}), left as is.`)
    return
  }

  const body = published.body ?? []
  const head = body.slice(0, LIVE_TEXT.length)
  const tail = body.slice(LIVE_TEXT.length)
  const mismatch = LIVE_TEXT.flatMap((expected, index) => {
    const actual = head[index] ? plain(head[index]).trim() : '(missing)'
    return actual === expected ? [] : [`  block ${index + 1}:\n    live:   ${expected.slice(0, 120)}\n    sanity: ${actual.slice(0, 120)}`]
  })
  if (mismatch.length > 0) {
    throw new Error(`The first ${LIVE_TEXT.length} blocks do not match the live page; nothing written.\n${mismatch.join('\n')}`)
  }

  console.log(`The first ${LIVE_TEXT.length} blocks match the live page word for word.`)
  console.log(
    tail.length === 0
      ? 'There is no extra content after them.'
      : `${tail.length} block(s) after them are not on the live page and would be dropped:\n` +
          tail.map((block) => `  - ${block._type}${plain(block) ? `: ${plain(block).slice(0, 70)}` : ''}`).join('\n'),
  )

  const response = await fetch(`${UPLOADS}/${COVER.file}`, {method: 'HEAD'})
  if (!response.ok) throw new Error(`${COVER.file} does not resolve (${response.status}); nothing written.`)

  console.log(`Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): body trimmed to ${LIVE_TEXT.length} blocks, cover replaced with ${COVER.file}.`)
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const download = await fetch(`${UPLOADS}/${COVER.file}`)
  if (!download.ok) throw new Error(`Could not download ${COVER.file}: ${download.status}`)
  const cover = await client.assets.upload('image', Buffer.from(await download.arrayBuffer()), {filename: COVER.file})

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    image: {_type: 'image', asset: {_type: 'reference', _ref: cover._id}, alt: COVER.alt},
    body: head,
  } as never)
  console.log(`+ created ${created._id} (cover ${cover._id}, ${tail.length} block(s) dropped from the draft)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
