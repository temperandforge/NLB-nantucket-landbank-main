/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/cisco-parking-lot-relocation/
 * into the existing `project` with slug `cisco-beach-parking-lot-relocation` (page at
 * /projects/cisco-beach-parking-lot-relocation; the old address used a shorter slug).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importCiscoBeachParkingLot.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importCiscoBeachParkingLot.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `body`, and a REPLACED `image`) and five image assets downloaded from the live site.
 * The published project is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description` or
 * `projectTypes`. --dry prints the plan, checks every asset resolves, and writes and uploads nothing.
 * The project must already exist (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - cover image: replaced, at the user's request. The project's existing image was a placeholder
 *    (an abstract gradient), not a photo of the site. The new one is the second of the page's two
 *    erosion photos, which shows the slumped bluff clearly. The source's own featured image (its
 *    og:image) is the NOAA sea-level chart, which makes a poor cover and stays in the body.
 *    The previous image asset is left in the dataset (unreferenced) rather than deleted.
 *  - because that photo is the cover it is NOT repeated in the body. The source shows the two erosion
 *    photos side by side; here the other one is a single body image under the opening paragraph.
 *  - the source has no headings, so the page has no jump nav: opening paragraph, photo, then the
 *    story in order with its three images.
 *  - the NOAA chart's caption is an italic paragraph under it (a project body image has no caption
 *    field). The "NOAA's High sea level rise scenarios" link goes to the Town page it pointed to.
 *  - text is verbatim, including the source's "The Lank Bank received permits" (sic); trailing
 *    spaces are trimmed.
 *  - alt text: the source's own alt text is used.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'cisco-beach-parking-lot-relocation'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'
const SLR_URL = 'https://www.nantucket-ma.gov/2989/Sea-Level-Rise'

const COVER = {file: 'down-net_http20240530-92-ps8tlu-1.jpg', alt: 'Erosion at Cisco Beach'}

const IMAGES = {
  erosion: {file: 'down-net_http20240530-92-ypk0tv-1.jpg', alt: 'Erosion at Cisco Beach'},
  noaa: {
    file: 'NOAA-SLR-Scenario.jpg',
    alt: 'Sea Level Rise Scenario at Cisco Beach (NOAA)',
    caption: 'Sea Level Rise Scenario at Cisco Beach (NOAA)',
  },
  vegetation: {file: 'Cisco-Vegetation.jpg', alt: 'Vegetation at Cisco'},
  proposed: {file: 'Proposed-Parking-Lot-Area.jpg', alt: 'Proposed Parking Lot Area'},
} as const
type ImageName = keyof typeof IMAGES

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

const block = (key: string, children: Span[], markDefs: object[] = []) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs,
  children,
})
const text = (key: string, value: string) => block(key, [span(`${key}-s`, value)])
const caption = (key: string, value: string) => block(key, [span(`${key}-s`, value, ['em'])])

async function download(file: string) {
  const response = await fetch(`${UPLOADS}/${file}`)
  if (!response.ok) throw new Error(`Could not download ${file}: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const docs = await client.fetch<Array<Record<string, unknown> & {_id: string; body?: unknown[]}>>(
    `*[_type == "project" && slug.current == $slug]`,
    {slug: SLUG},
  )
  const published = docs.find((doc) => !doc._id.startsWith('drafts.'))
  if (!published) throw new Error(`No project with slug "${SLUG}"; run seedLandBankProjects.ts first. Nothing written.`)
  const draft = docs.find((doc) => doc._id === `drafts.${published._id}`)
  if (draft) {
    console.log(`= a draft already exists (${draft._id}), left as is.`)
    return
  }
  if (published.body?.length) {
    console.log(`= ${published._id} already has body content, left as is.`)
    return
  }

  // Resolve every asset before writing anything, so a dead link stops the whole run.
  const files = [COVER.file, ...Object.values(IMAGES).map((image) => image.file)]
  for (const file of files) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): cover image replaced with ${COVER.file}, ` +
      `body of 6 paragraphs and ${Object.keys(IMAGES).length} images, no headings.`,
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const cover = await client.assets.upload('image', await download(COVER.file), {filename: COVER.file})
  const ids = {} as Record<ImageName, string>
  for (const [name, image] of Object.entries(IMAGES) as Array<[ImageName, (typeof IMAGES)[ImageName]]>) {
    ids[name] = (await client.assets.upload('image', await download(image.file), {filename: image.file}))._id
  }
  const img = (name: ImageName) => ({
    _type: 'image',
    _key: `img-${name}`,
    asset: {_type: 'reference', _ref: ids[name]},
    alt: IMAGES[name].alt,
  })

  const body = [
    text(
      'p1',
      'During the winter of 2023/2024, southerly storms caused significant erosion along the south shore of Nantucket, and especially at the Land Bank’s Cisco Beach bluff. Eventually, the erosion undermined the front row of parking at Cisco Beach, which resulted in a permanent closure of the front parking area to maintain safe conditions for the public.',
    ),
    img('erosion'),
    block(
      'p2',
      [
        span(
          'p2-a',
          'The loss of this parking lot to erosion was not unexpected, and the Land Bank had been preparing for this moment for several years. ',
        ),
        span('p2-b', 'NOAA’s “High” sea level rise scenarios', ['slr-link']),
        span(
          'p2-c',
          ' (as pictured below), predicted the entire front parking lot would be eroded by 2030. Because the Land Bank had access to this data, we began working in 2021 to plan for a new parking lot with habitat protection and coastal resilience in mind.',
        ),
      ],
      [{_type: 'link', _key: 'slr-link', linkType: 'href', href: SLR_URL, openInNewTab: true}],
    ),
    img('noaa'),
    caption('cap-noaa', IMAGES.noaa.caption),
    text(
      'p3',
      'We began this project by surveying the surrounding habitat to see which area would be most suitable for the new parking lot. The habitat inland of Cisco Beach is an example of sandplain grassland and coastal heathland. Though this habitat is globally rare, Nantucket is fortunate to have a large extent of this habitat from Head of the Plains in the west through Smooth Hummocks to the sewer beds east of Miacomet Pond. To comply with state regulations, the Land Bank embarked on a series of seasonal ecological surveys of the area in 2021, which continued each spring and summer through May 2024.',
    ),
    img('vegetation'),
    text(
      'p4',
      'After taking many factors into consideration, including several placement options and the results of the state-mandated surveys, the Land Bank Commission chose to locate the replacement parking lot to the west of the Beach Access Road. One major factor was coastal resilience. As such, the Land Bank decided to orient the parking lot perpendicular to the shore, so that fewer parking spots will be lost at any one time as erosion continues to shift and shape this coastline.',
    ),
    img('proposed'),
    text(
      'p5',
      'The Lank Bank received permits to install this 65-space parking lot in June 2024, and got right to work! In order to have this much needed parking available for the summer beach season, the Land Bank will phase construction. The first phase is already completed, and the lot is available to be used by beachgoers today. This summer, visitors can expect a mowed grass surface to the lot, which allowed the Land Bank to expedite its installation. We are exploring the installation of a sand/gravel surface, like the pre-existing lot at Cisco, after the summer 2024 season.',
    ),
    text(
      'p6',
      'We are committed to maintaining public access to this beloved beach, and we appreciate our community’s patience as we work to fast track this property improvement.',
    ),
  ]

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    image: {_type: 'image', asset: {_type: 'reference', _ref: cover._id}, alt: COVER.alt},
    body,
  } as never)
  console.log(`+ created ${created._id} (cover ${cover._id}, ${Object.keys(ids).length} body images)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
