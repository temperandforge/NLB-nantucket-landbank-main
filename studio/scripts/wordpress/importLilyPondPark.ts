/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/lily-pond-park-project/
 * into the existing `project` with slug `lily-pond-park-project` (page at /projects/lily-pond-park-project).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importLilyPondPark.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importLilyPondPark.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `image` and `body`) and eleven image assets downloaded from the live site. The
 * published project is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description` or `projectTypes`.
 * --dry prints the plan, checks every asset resolves, and writes and uploads nothing. The project
 * must already exist (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - image: the page's lead image, the old map of Nantucket (also its og:image), is the project image
 *    and is NOT repeated in the body.
 *  - description: kept as seeded.
 *  - NOT migrated: the "Contact us" section (heading, its one-line intro and the contact form), at the
 *    user's request. The page therefore ends on the Timeline.
 *  - sections: History, The Effects of Wetlands, Project Plan and Timeline are H2 and become the jump nav.
 *  - the four numbered objectives are written in the source as paragraphs starting "1)" to "4)". They
 *    are a real numbered list here, with the typed numbers removed so they are not doubled.
 *  - text is verbatim, including the source's "Horsely Witten" (sic) and the missing full stop on the
 *    third Timeline line. Two encoding artefacts are fixed: the "ﬀ" and "ﬂ" ligature characters (from a
 *    PDF paste: "runoﬀ", "ﬂood") become "ff" and "fl", and non-breaking spaces become ordinary spaces.
 *  - Timeline lines keep their bold date lead-ins.
 *  - alt text: the source has none on most images; it is written from looking at each photo. There are
 *    no captions in the source.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'lily-pond-park-project'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

const HERO = {file: 'Old-Nantucket-Map.jpg', alt: 'Old map of the Island of Nantucket'}

/** Body images by key, in the order they appear on the page. */
const IMAGES: Record<string, {file: string; alt: string}> = {
  geese: {file: 'gpn4147-scaled.jpg', alt: 'Historic photograph of geese on the bank of a pond, with a fence and houses beyond'},
  haying: {file: 'gpn4206-scaled.jpg', alt: 'Historic photograph of a horse and cart haying in an open field'},
  northLiberty: {
    file: 'North-liberty-street-from-LP-scaled.jpg',
    alt: 'Historic photograph of houses seen across the reeds of the former pond bed',
  },
  harvest: {file: 'gpn2777-scaled.jpg', alt: 'Historic photograph of families and a hay wagon in a field'},
  flooding: {file: 'LP-Flooding.jpg', alt: 'Street flooded with stormwater beside the park'},
  pooling: {file: 'LP-flooding1-scaled.jpg', alt: 'Water pooled at the edge of the park path'},
  plan: {file: 'Lily-Pond-Rendering.jpg', alt: 'Plan of the Lily Pond Park improvements, showing the restored wetland and boardwalk loop'},
  landscape: {file: '36-Lily-Street-Open-Space-1.jpg', alt: 'Illustration of the planned wetland and lawn'},
  entrance: {file: 'North-Liberty-Street-Entrance.jpg', alt: 'Illustration of the planned entrance with a bench and path beside the wetland'},
  boardwalk: {file: 'North-Liberty-Street.jpg', alt: 'Illustration of the planned boardwalk winding through the restored wetland'},
}

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

/** Fix the PDF-paste ligatures; the rest of the text is left exactly as the source has it. */
const clean = (value: string) => value.replace(/ﬀ/g, 'ff').replace(/ﬂ/g, 'fl').replace(/ /g, ' ')

const block = (key: string, style: 'normal' | 'h2', children: Span[], list?: 'number') => ({
  _type: 'block',
  _key: key,
  style,
  markDefs: [],
  ...(list ? {listItem: list, level: 1} : {}),
  children,
})
const text = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, clean(value))])
const heading = (key: string, value: string) => block(key, 'h2', [span(`${key}-s`, clean(value))])
const numbered = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, clean(value))], 'number')
/** A line that opens with a bold lead-in, as the Timeline entries do. */
const lead = (key: string, bold: string, rest: string) =>
  block(key, 'normal', [span(`${key}-a`, bold, ['strong']), span(`${key}-b`, rest)])

const imageBlock = (key: string, assetId: string, alt: string) => ({
  _type: 'image',
  _key: `img-${key}`,
  asset: {_type: 'reference', _ref: assetId},
  alt,
})

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
  const files = [HERO.file, ...Object.values(IMAGES).map((image) => image.file)]
  for (const file of files) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): image ${HERO.file}, ` +
      `body with 4 H2 sections and ${Object.keys(IMAGES).length} body images; Contact us section omitted.`,
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const hero = await client.assets.upload('image', await download(HERO.file), {filename: HERO.file})
  const ids: Record<string, string> = {}
  for (const [name, image] of Object.entries(IMAGES)) {
    ids[name] = (await client.assets.upload('image', await download(image.file), {filename: image.file}))._id
  }
  const img = (name: string) => imageBlock(name, ids[name], IMAGES[name].alt)

  const body = [
    heading('h-history', 'History'),
    text(
      'hist-1',
      'Long before it became the quiet, contemplative park we know today, Lily Pond was a thriving body of water sitting at the very heart of Nantucket’s harbor life. In the early 1600s, when it was still known as Wesco Pond, the water was deep enough that medium-sized vessels and sailboats could enter freely and moor, making it more of a working part of the town’s maritime activity than the quiet green space it is now.',
    ),
    text(
      'hist-2',
      'An outlet called Wesco Brook, later renamed Barzillai’s Creek, linked the pond to the harbor beyond, tracing a path along what is now present-day Chester Street and drawing water in and out with the rhythm of the tides, twice each day without fail. That current ran strong enough to be harnessed for use, and so in the 1660s, English settlers built a dam across the outlet to control and direct its flow. By 1667, that dam was a fulling mill, an essential piece of the island’s early textile-making process, on the very site where American Seasons Restaurant stands today. A second mill followed not long after, built in 1673 near the corner of Center Street, a sign of just how central this small waterway had become to the town’s growing economy.',
    ),
    img('geese'),
    text(
      'hist-3',
      'According to legend, the pond met its unexpected fate in the 1720s when eleven-year-old Love Paddack was digging a few idle gutters in the mud with a shell to watch the water run along the little channels she’d carved. She thought little about it and went home for the evening. However, by the next morning the entire pond had completely drained. It was as if it had never existed at all. The fulling mill was left high and dry, boats that had once floated peacefully now lay damaged or ruined on the exposed pond bed, and the town, understandably, erupted into an uproar over the sudden and inexplicable loss. Love, terrified of what she had done and the anger it had stirred among her neighbors, kept her secret close for nearly seventy years, only confessing the truth on her deathbed in 1792. The pond, once so central to daily life, never refilled.',
    ),
    img('haying'),
    text(
      'hist-4',
      'The land that once held water gave way to homes and streets. The Wesco Acre Lots, laid out as early as 1678, marked the area’s very first “development”, and by 1799, Lily Street had officially appeared on the Town Assessor’s list of named roads. Through much of the 19th century, the former pond bed was used primarily as hay and grazing land for the town’s livestock; although pockets of open water lingered in low spots well into the early 1900s, quiet reminders of what had once been there.',
    ),
    img('northLiberty'),
    img('harvest'),
    text(
      'hist-5',
      'Today, the park’s 6.5 acres center on a freshwater wetland that sustains a rich and varied array of plant and animal life, all while quietly absorbing stormwater runoff from the surrounding roads, roofs, and other hardscape surfaces. Yet aging infrastructure, years of accumulated sediment, and low-lying lawns and paths that are prone to pooling during heavy storms all mean that, despite its ecological value, the park currently falls well short of its full potential.',
    ),
    heading('h-wetlands', 'The Effects of Wetlands'),
    text(
      'wet-1',
      'Wetlands act as natural water filters, removing pollutants, excess nutrients, and sediment from the water that passes through them. Once restored, this wetland will do exactly that. As water flows in, sediment will settle out, plants will absorb pollutants, and naturally occurring microorganisms will break down harmful bacteria. Together, this filtration process will improve water quality downstream and all the way to our harbor.',
    ),
    text(
      'wet-2',
      'The restoration will also help reduce flooding in the area. However, because of high groundwater tables and existing downstream infrastructure, it won’t add significant new water-storage capacity.',
    ),
    heading('h-plan', 'Project Plan'),
    text(
      'plan-1',
      'Lily Pond Park (“Park”) is a 6.5-acre parcel managed by the Land Bank and located west of downtown Nantucket, in the Nantucket Harbor Watershed. The Park sits in a low-lying area with six outfall pipes that discharge stormwater runoﬀ from a 90-acre surrounding residential area. Untreated runoff entering the Park is conveyed into a 5-acre natural wetland. An overﬂow structure is located at the downstream end of the wetland and flows into the Town’s drainage system at a large manhole located by the intersection of Centre St. and Chester St. Drainage from the Park is piped directly and discharged into the Harbor at Children’s Beach.',
    ),
    text(
      'plan-2',
      'In addition to serving as a popular public recreational amenity, the Park provides ﬂood attenuation, wildlife habitat, and carbon sequestration benefits. Over time, the wetland’s function and Park usage have been negatively impacted by unmanaged stormwater runoﬀ, invasive vegetation, clogged drainage infrastructure, and limited visibility.',
    ),
    img('flooding'),
    text(
      'plan-3',
      'The Land Bank has been collaborating with Horsely Witten since 2020 on design and permitting for the Lily Pond Park Improvements Project. During the planning process, existing conditions were meticulously and thoroughly evaluated. For instance, during the stormwater and water table reading analysis, it was determined that there is a difference in water elevations between the outlet structure, ponding water near the boardwalk, and in the ground water monitoring wells. These discrepancies indicated there are fluctuations in ground water elevation and/or landform barriers near the outlet structure restricting the flow of water.',
    ),
    img('pooling'),
    text(
      'plan-4',
      'Prior to issuing the bid specifications and construction drawings, the schematic designs were reviewed for overall constructability including site access, staging, excavation, dewatering, soil disposal, and sequence of construction. The project is divided into three main Wetland Restoration Areas which guide the sequence of construction with respect to drainage/dewatering, stormwater management, habitat restoration, circulation, material, and preliminary grading. The goal of the stormwater design is to optimize the collection, capture and clean runoff while improving the flow of water entering and exiting the wetland through the use of green infrastructure practices. Other modalities include sediment forebays, bioretention areas, hydrodynamic separators, and constructed stormwater wetlands. These will function to capture sediment, facilitate pollutant removal, and treat stormwater runoff before discharging into the wetlands.',
    ),
    text(
      'plan-5',
      'The methodology, decisions, calculations, and overall design are further informed by the feedback and comments our team solicited throughout this process from local and state permitting agencies, various Town Staff, the Commission on Disability, as well as community members. The resulting scope includes wetland restoration, water quality and drainage improvements, installation of an accessible looped boardwalk, pathways, gateway entrance, and parking lot enhancements.',
    ),
    img('plan'),
    text(
      'plan-6',
      'We recently put the project out to bid and have awarded the contract to SumCo EcoContracting LLC. The work will be conducted in two phases with an estimated timeframe of 18 months. Phase 1 is scheduled to be underway from September 2026 – June 2027 and Phase 2 to run from September 2027 – May 2028.',
    ),
    text(
      'plan-7',
      'The overall goal of the project is to improve the hydrologic, ecological, and recreational functions of the Park by meeting the following four objectives:',
    ),
    numbered('obj-1', 'improve the quality and better manage the quantity of stormwater coming into, stored within, and ﬂowing out of the Park;'),
    numbered('obj-2', 'address the surrounding area impacts including ﬂooding, invasive control, and improved public access;'),
    numbered('obj-3', 'diversify habitats in the Park through wetland restoration and invasive species management; and'),
    numbered(
      'obj-4',
      'improve the visitor experience within the Park by enhancing entrances, improving accessibility, expanding internal circulation, providing educational signage and outreach, and creating scenic passive recreation spaces.',
    ),
    img('landscape'),
    text(
      'plan-8',
      'Wetland restoration goals to improve water flow, water quality, and wildlife habitat will be achieved by incorporating a variety of elevations to provide areas of surface water with different depths that will hold water for varying periods throughout the year, interspersed with hummocks to enhance the diversity of conditions within the wetland. Planted and seeded native species will consist of woody and emergent vegetation that provide food sources for wildlife to mimic existing conditions and further promote diverse conditions that benefit wildlife. A planting palette was developed for the restored wetland with plants located based on water depth.',
    ),
    img('entrance'),
    img('boardwalk'),
    heading('h-timeline', 'Timeline'),
    lead('tl-1', 'September 2026-June 2027', ': The Park will be closed for Phase 1 of the project.'),
    lead(
      'tl-2',
      'Summer 2027:',
      ' We will halt all construction and restoration work and reopen the park so the community can enjoy the space and see the progress that has been made.',
    ),
    lead('tl-3', 'September 2027-May 2028:', ' The Park will close again for Phase 2 and all remaining work'),
    lead(
      'tl-4',
      'May 2028:',
      ' Lily Pond Park will officially reopen with continued restoration and water quality monitoring',
    ),
  ]

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    image: {_type: 'image', asset: {_type: 'reference', _ref: hero._id}, alt: HERO.alt},
    body,
  } as never)
  console.log(`+ created ${created._id} (image ${hero._id}, ${Object.keys(ids).length} body images)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
