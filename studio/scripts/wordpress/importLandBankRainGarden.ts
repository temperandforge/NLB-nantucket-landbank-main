/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/land-bank-rain-garden/
 * into the existing `project` with slug `land-bank-rain-garden` (page at /projects/land-bank-rain-garden).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importLandBankRainGarden.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importLandBankRainGarden.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `image` and `body`), eight image assets and one PDF file asset, all downloaded from
 * the live site. The published project is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description` or `projectTypes`.
 * --dry prints the plan, checks every asset resolves, and writes and uploads nothing. The project
 * must already exist (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - image: the first photo of the opening set (the benches; also the page's og:image) is the project
 *    image and is NOT repeated in the body.
 *  - description: kept as seeded.
 *  - sections: the four H2s (Previous Conditions at 65 & 67 Easton Street, Land Bank Rain Garden
 *    Project, What is a Rain Garden?, Build Your Own Rain Garden) become the jump nav.
 *  - captions: a project body image has no caption field, so each caption is an italic paragraph
 *    directly under its image. The source's line break inside "Concept <br>Plan" is a space.
 *  - alt text: where the source has none it is written from looking at the photo.
 *  - bold: the source's bold sentences ("Construction began...", "A rain garden is a shallow
 *    depression...") are kept as bold.
 *  - "Build your own rain garden" PDF: the source links to an old-site URL that redirects to a PDF.
 *    It is uploaded to Sanity and linked from there so it survives the old site's retirement.
 *  - the text is otherwise verbatim; the source's stray inline styling (a font-size and colour reset
 *    mid-sentence) is dropped.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'land-bank-rain-garden'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

const HERO = {file: 'EastonStBenches-1.jpg', alt: 'Benches at Land Bank Rain Garden'}
const PDF = 'Build-your-own-Rain-Garden_Final-Horsley-Witten-Group.pdf'

const IMAGES = {
  flooding: {
    file: 'down-net_http20240312-93-8s56gh-1.jpg',
    alt: 'Stormwater pooling along the curb of a street after rain',
  },
  standingWater: {
    file: 'EastonStLawnFlooding-2.jpg',
    alt: 'Standing water among the grass on the lawn at 65 & 67 Easton Street',
  },
  lawn: {file: 'Easton-St-Lawn-1.jpg', alt: 'The open lawn at 65 & 67 Easton Street before the project'},
  concept: {
    file: 'Final-Concept-Easton-St-2.3.2023-JPG_Page_1_Page_1.jpg',
    alt: 'Land Bank Rain Garden Concept Plan',
    caption: 'Land Bank Rain Garden Concept Plan (Horsley Witten)',
  },
  opening: {
    file: 'down-net_http20240801-79-nggqu7-scaled.jpg',
    alt: 'Visitors gathered beside the new rain garden at its opening party',
    caption: 'Land Bank Rain Garden | July 2024',
  },
  graphic: {
    file: 'Rain-Garden-Graphic-Horsley-Witten.jpg',
    alt: 'Cross-section of a typical rain garden',
    caption: 'Rain Garden Design Example (Horsley Witten)',
  },
  example: {
    file: 'Rain-Garden-1.jpg',
    alt: 'Rain Garden Example',
    caption: 'Rain Garden (Horsley Witten)',
  },
}

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

const block = (key: string, style: 'normal' | 'h2', children: Span[], markDefs: object[] = []) => ({
  _type: 'block',
  _key: key,
  style,
  markDefs,
  children,
})
const text = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, value)])
const heading = (key: string, value: string) => block(key, 'h2', [span(`${key}-s`, value)])
const caption = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, value, ['em'])])
const imageBlock = (key: string, assetId: string, alt: string) => ({
  _type: 'image',
  _key: key,
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
  const files = [HERO.file, PDF, ...Object.values(IMAGES).map((image) => image.file)]
  for (const file of files) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): image ${HERO.file}, ` +
      `body with 4 H2 sections, ${Object.keys(IMAGES).length} body images, PDF ${PDF}.`,
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
  const pdf = await client.assets.upload('file', await download(PDF), {filename: PDF, contentType: 'application/pdf'})

  const body = [
    heading('h-previous', 'Previous Conditions at 65 & 67 Easton Street'),
    text(
      'prev-1',
      'The Land Bank acquired 65 & 67 Easton Street, a 0.2 acre property, in 2020 with the goal of preserving existing downtown green space on a highly visible street corner. Before this project, this property served as a simple open park with a few shade trees, and benches for visitors to sit on as they enjoy the space.',
    ),
    text(
      'prev-2',
      'This property experiences frequent flooding during precipitation events. When rain falls on impervious surfaces such as roads, roofs, and parking lots, it does not soak into the ground. That stormwater runoff picks up pollutants (e.g., fertilizer, sediment, pet/yard waste) and then flows into storm drains. The storm drains located at Easton Street lead to the harbor, so the Land Bank took on this project to improve the ability of this park to store and filter stormwater before it enters the harbor, thereby improving our harbor water quality.',
    ),
    imageBlock('img-flooding', ids.flooding, IMAGES.flooding.alt),
    imageBlock('img-standing', ids.standingWater, IMAGES.standingWater.alt),
    imageBlock('img-lawn', ids.lawn, IMAGES.lawn.alt),
    heading('h-project', 'Land Bank Rain Garden Project'),
    block('project-text', 'normal', [
      span(
        'project-text-a',
        'The Land Bank Rain Garden was developed by the Horsley Witten Group in collaboration with the Land Bank to better absorb and filter stormwater runoff before entering our harbor via storm drains. Key features of this project include the installation of the rain garden itself, as well as educational signage, an ADA-accessible walkway, and picnic tables. ',
      ),
      span(
        'project-text-b',
        'Construction began during Winter 2024, and the park is officially open to the public!',
        ['strong'],
      ),
    ]),
    imageBlock('img-concept', ids.concept, IMAGES.concept.alt),
    caption('cap-concept', IMAGES.concept.caption),
    imageBlock('img-opening', ids.opening, IMAGES.opening.alt),
    caption('cap-opening', IMAGES.opening.caption),
    heading('h-what', 'What is a Rain Garden?'),
    block('what-text', 'normal', [
      span(
        'what-text-a',
        'A rain garden is a shallow depression that is intentionally designed and landscaped to direct, absorb, and filter stormwater runoff before it runs into storm drains.',
        ['strong'],
      ),
      span(
        'what-text-b',
        ' Rain gardens contain native perennial plants with robust root systems and soil microbes that are able to absorb large quantities of water, as well as filter out pollutants (much more effectively than the existing lawn at this property). This bioretention process will have a positive impact on our harbor water quality. When made with native species, rain gardens can also provide pockets of wildlife habitat.',
      ),
    ]),
    imageBlock('img-graphic', ids.graphic, IMAGES.graphic.alt),
    caption('cap-graphic', IMAGES.graphic.caption),
    imageBlock('img-example', ids.example, IMAGES.example.alt),
    caption('cap-example', IMAGES.example.caption),
    heading('h-build', 'Build Your Own Rain Garden'),
    block(
      'build-text',
      'normal',
      [
        span(
          'build-text-a',
          'A rain garden is a project that anyone could implement in their own yard to reduce unwanted flooding, improve stormwater quality, and provide a small pocket of wildlife habitat! ',
        ),
        span('build-text-b', 'Click here to learn how to build your own rain garden (Horsley Witten)!', ['build-link']),
      ],
      [{_type: 'link', _key: 'build-link', linkType: 'href', href: pdf.url, openInNewTab: true}],
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
  console.log(`+ created ${created._id} (image ${hero._id}, ${Object.keys(ids).length} body images, pdf ${pdf._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
