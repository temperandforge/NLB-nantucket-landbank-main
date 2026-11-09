/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/active-management-for-resilient-forests/
 * into the existing `project` with slug `forest-management-project` (page at
 * /projects/forest-management-project; the old address used a different slug).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importForestManagement.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importForestManagement.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `image` and `body`), four image assets and one PDF file asset, all downloaded from
 * the live site. The published project is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description` or
 * `projectTypes` (this project has no project type yet; none is set). --dry prints the plan, checks
 * every asset resolves, and writes and uploads nothing. The project must already exist
 * (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - cover image: the project had none. The "Gardner Farm" pitch-pine trail photo is used (it has no
 *    text overlay and is landscape). The source's own featured image is the "Before" photo, which is
 *    stamped with GPS text. That photo is therefore NOT repeated in the body, where the source puts it
 *    under "Background" with the caption "Gardner Farm".
 *  - sections: Active Forest Management, Background, What can I do? and Learn more: are H2 and become
 *    the jump nav ("Learn more:" keeps the source's colon).
 *  - the Before and After photos side by side are an Image gallery. The source has no alt text; it is
 *    written from the photos (their on-image stamps say Gardner Photopoint 1, 19 Dec 2023 and 27 Mar 2024).
 *  - the pitch-tube photo's caption ("Pitch tube") is an italic paragraph under it (a project body
 *    image has no caption field). The SPB composite photo carries its own labels, so it has none.
 *  - the source's run of empty paragraphs (spacing for the floated photos) is dropped.
 *  - "SPB info sheet": a PDF on the old site; uploaded to Sanity and linked from there. The other
 *    links in "Learn more:" (a sign-up form for walks on Nov 8th & 10th, YouTube videos, news
 *    stories) are kept as links to where they point today. The sign-up form is for 2024 dates and
 *    is probably stale: an editor should decide whether to keep it.
 *  - text is verbatim, including "Winter 2025 the Land Bank will perform ..." with no full stop at the
 *    end of the paragraph; non-breaking spaces become ordinary spaces and line breaks inside the
 *    "What can I do?" paragraph become spaces.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'forest-management-project'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

const COVER = {file: 'Gardner-woods-CROP.jpg', alt: 'Gardner Farm pitch pines'}
const PDF = 'SPB-info-sheet.FINAL_.pdf'

const IMAGES = {
  before: {file: 'Before.GU1_.1.jpg', alt: 'Gardner Farm pitch pine forest before active management, December 2023'},
  after: {file: 'After.GU1_.1.jpg', alt: 'The same view at Gardner Farm after active management, March 2024'},
  spb: {
    file: 'SPB-pics.jpg',
    alt: '(From Left to Right): Pitch Tube, Southern Pine Beetle, Dead Pitch Pines',
  },
  pitchTube: {file: 'pitch-tube.png', alt: 'Pitch tube'},
} as const
type ImageName = keyof typeof IMAGES

/** A piece of a paragraph: plain text, or text that is a link. */
type Piece = string | {text: string; href: string}

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

type Style = 'normal' | 'h2'
function rich(key: string, pieces: Piece[], style: Style = 'normal', listItem?: 'bullet') {
  const markDefs: object[] = []
  const children = pieces.map((piece, index) => {
    if (typeof piece === 'string') return span(`${key}-${index}`, piece)
    const linkKey = `${key}-l${index}`
    markDefs.push({_type: 'link', _key: linkKey, linkType: 'href', href: piece.href, openInNewTab: true})
    return span(`${key}-${index}`, piece.text, [linkKey])
  })
  return {_type: 'block', _key: key, style, markDefs, ...(listItem ? {listItem, level: 1} : {}), children}
}
const text = (key: string, value: string) => rich(key, [value])
const heading = (key: string, value: string) => rich(key, [value], 'h2')
const bullet = (key: string, pieces: Piece[]) => rich(key, pieces, 'normal', 'bullet')
const caption = (key: string, value: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [span(`${key}-s`, value, ['em'])],
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
  const files = [COVER.file, PDF, ...Object.values(IMAGES).map((image) => image.file)]
  for (const file of files) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): cover ${COVER.file}, body with 4 H2 sections, ` +
      `1 image gallery (2), ${Object.keys(IMAGES).length - 2} body images, PDF ${PDF}.`,
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
  const pdf = await client.assets.upload('file', await download(PDF), {filename: PDF, contentType: 'application/pdf'})

  const img = (name: ImageName) => ({
    _type: 'image',
    _key: `img-${name}`,
    asset: {_type: 'reference', _ref: ids[name]},
    alt: IMAGES[name].alt,
  })
  const galleryImage = (name: ImageName) => ({
    _type: 'galleryImage',
    _key: `g-${name}`,
    asset: {_type: 'reference', _ref: ids[name]},
    alt: IMAGES[name].alt,
  })

  const body = [
    heading('h-active', 'Active Forest Management'),
    rich('active-1', [
      'In 2023/2024 the Land Bank performed the first active forest management project for SPB resilience on Nantucket at Gardner Farm at 151 Hummock Pond Road. This project was completed by Land Bank staff and was partially supported by a grant from ',
      {text: 'MassWildlife', href: 'https://www.mass.gov/info-details/masswildlife-habitat-management-grant-recipients'},
      '.',
    ]),
    {_type: 'imageGallery', _key: 'before-after', images: [galleryImage('before'), galleryImage('after')]},
    text(
      'active-2',
      'In 2024/2025 the Land Bank will continue in house active forest management in the northern and western areas of Gardner Farm. This work will begin in November 2024 and continue through the winter season.',
    ),
    text(
      'active-3',
      'Winter 2025 the Land Bank will perform understory thinning at Hinsdale Forest. This property contained a thick scrub oak understory, which will be thinned to decrease the threats of wildfire and SPB. This will prepare the site for thinning of pitch pine in future years',
    ),
    heading('h-background', 'Background'),
    rich('bg-1', [
      'Scraggly pitch pine and scrub oak forests like those found at Gardner Farm are an iconic habitat of southeastern Massachusetts, the Cape, and the Islands. Despite their current ubiquity on the island, pitch pines were introduced to Nantucket in the 1800s to form a windbreak along Milestone Road. Pitch pine and scrub oak thrive on the low nutrient-sandy soils and harbor a plant and animal community that is adapted to withstand and flourish in the presence of frequent fire and other natural disturbance such as salt spray and drought. This habitat is often termed ',
      {text: '“pitch pine – scrub oak barrens”', href: 'https://www.mass.gov/doc/pitch-pine-scrub-oak-community-0/download'},
      '. European settlers used the term barrens because they could not cultivate their crops in these landscapes, but the areas are anything but bare. The unique barrens ecosystems support a diversity of rare plants, insects, and animals such as box turtles and bats. The Land Bank has big plans to actively manage these ecosystems to foster more resilient forests on island!',
    ]),
    text(
      'bg-2',
      'The pine barrens on Nantucket and regionwide have deteriorated due to minimal management and fire suppression since European settlers arrived. The habitats are now overmature; trees are densely packed and stressed for resources, and the understory diversity is decreased due to less sunlight reaching the ground through the crowded canopy and the deep layer of old needles and woody debris smothering new growth. The lack of host plants (i.e., plants that organisms live and subsist on) in the understory means there may be fewer moths and other insects available to support the federally endangered northern long-eared bat, which resides in these woods on Nantucket.',
    ),
    text(
      'bg-3',
      'When under such stress, these characteristic ecosystems are not resilient in the face of multiple and increasing threats due to climate change. Our summers are becoming hotter, with droughts and stronger storms a more frequent occurrence. The stressed trees are vulnerable to forest disease. Wildfire and running crown fire, where fire jumps from tree to tree in the canopy, are a greater risk because the trees are close together and ladder fuels (i.e., small trees, brush, and dead branches/limbs) have accumulated.',
    ),
    rich('bg-4', [
      'Perhaps the most urgent threat facing our stressed pine stands is the range expansion of the southern pine beetle (SPB). This forest pest is native to the southeastern United States and has been moving north as winter temperatures have warmed over the recent decades. These beetles can disperse long distances in the air currents and prevailing winds. Once they infest a tree, they release pheromones which call in other beetles, quickly overwhelming the tree’s defenses. Trees attempt to “pitch out” the beetles by pushing them out with their sap or pitch. Stressed trees cannot mount an effective defense against the SPB and quickly succumb to the infestation within weeks. This summer, an ',
      {text: 'outbreak of SPB', href: 'https://www.ack.net/stories/southern-pine-beetle-infestation-ravaging-island-trees,32782'},
      ' was discovered by the Nantucket Conservation Foundation in their West Gate property and they acted quickly to halt the infestation by cutting trees showing signs of SPB. This forest pest has also caused ',
      {text: 'several infestations', href: 'https://vineyardgazette.com/news/2023/08/15/pine-beetle-infestation-invades-island-forests'},
      ' this year on ',
      {text: 'Martha’s Vineyard', href: 'https://www.mvtimes.com/2023/08/29/managing-island-forests-invasive-beetles/'},
      '.',
    ]),
    img('spb'),
    text(
      'bg-5',
      'We now know that SPB is a threat that all pitch pine forest property owners will potentially have to grapple with in the near future. What can landowners and conservation groups do to prepare their forests to be resilient in the face of this threat and others, such as drought, disease, and wildfire? It turns out that the best recommendations from professional foresters, as well as state and federal agencies, center around managing the forests for “ecological integrity” and diminishing tree stress. Achieving more resilient pitch pine forests is the Land Bank’s management goal for these habitats. In the coming years, habitat management to reinforce the health of the overall forest habitat will include thinning overmature and overcrowded tree stands to maximize sunlight and airflow within the forest, promoting healthier trees and understories and more diversity in vascular plants, insects and the other animals that depend on these resources.',
    ),
    img('pitchTube'),
    caption('cap-pitch-tube', 'Pitch tube'),
    heading('h-what', 'What can I do?'),
    rich('what-1', [
      'The Nantucket Southern Pine Beetle Working Group is encouraging the public to report any trees showing symptoms of southern pine beetle infestation immediately to ',
      {text: 'spb@nantucketconservation.org', href: 'mailto:spb@nantucketconservation.org'},
      '. Please include GPS coordinates, specific directions, and a photo if possible.',
    ]),
    heading('h-learn', 'Learn more:'),
    bullet('learn-1', [
      {
        text: 'Sign up for public walks on Nov 8th & 10th',
        href: 'https://docs.google.com/forms/d/e/1FAIpQLSfEkKXE36lAY9GvrlNrEQ09rmOsrlhRPnGqfIgWSK5zlxmdRA/viewform?usp=sf_link',
      },
    ]),
    bullet('learn-2', [{text: 'Southern pine beetle info sheet', href: pdf.url}]),
    bullet('learn-3', [
      {
        text: 'The Future of our Forests – What a Southern Pine Beetle Outbreak Means for Nantucket',
        href: 'https://www.youtube.com/watch?v=negRCuRkoSU',
      },
    ]),
    bullet('learn-4', [
      {
        text: 'Southern Pine Beetle Outbreak Detected on Nantucket Conservation Foundation Property',
        href: 'https://www.nantucketconservation.org/southern-pine-beetle-outbreak-detected-on-nantucket-conservation-foundation-property/',
      },
    ]),
    bullet('learn-5', [
      {
        text: 'Science Pub: Southern Pine Beetles and Massachusetts’ Forests',
        href: 'https://www.youtube.com/watch?v=EIbz5Y0chIE',
      },
    ]),
    bullet('learn-6', [
      {
        text: 'MA DCR Forest Health Program Storyboard on southern pine beetle',
        href: 'https://storymaps.arcgis.com/stories/b60f63199fa14805a8b9f7c82447a25b',
      },
    ]),
    bullet('learn-7', [{text: 'Yesterday’s Island – FIGHTING THE SPB', href: 'https://yesterdaysisland.com/fighting-the-spb/'}]),
  ]

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    image: {_type: 'image', asset: {_type: 'reference', _ref: cover._id}, alt: COVER.alt},
    body,
  } as never)
  console.log(`+ created ${created._id} (cover ${cover._id}, ${Object.keys(ids).length} body images, pdf ${pdf._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
