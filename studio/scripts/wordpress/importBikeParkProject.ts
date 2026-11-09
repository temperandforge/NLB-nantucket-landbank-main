/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/bike-park-project/
 * into the existing `project` with slug `bike-park-project` (page at /projects/bike-park-project).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importBikeParkProject.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importBikeParkProject.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `body`) and eight image assets downloaded from the live site. The published project
 * is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description`, `image` or
 * `projectTypes` (this project already has its image, so none is set). --dry prints the plan, checks
 * every asset resolves, and writes and uploads nothing. The project must already exist
 * (seedLandBankProjects.ts creates it). Needs the Media & text, Image gallery and Video blocks in
 * the project body, which the studio schema must already have deployed.
 *
 * Decisions:
 *  - sections: What is a Bike Park?, Project Goals, Project Site, Design Approach (with two H3s),
 *    What's Next? and Learn More are H2 and become the jump nav. The opening paragraph has no heading
 *    in the source and stays above the first H2.
 *  - the four "Project Site" rows (image beside a paragraph) are Media & text blocks, image on the
 *    left as in the source. The "1995" caption on the second image is kept.
 *  - the four thumbnails under "What is a Bike Park?" are an Image gallery. Their captions are the
 *    source's own credits (highlandmountain.com, americanrampcompany.com, highfivesfoundation.org);
 *    the fourth has none.
 *  - the Zoom meeting recording is a Video block (YouTube).
 *  - the bold phrases in the Design Approach paragraph and the bullet list under Project Goals are kept.
 *  - NOT migrated: the source's spacer blocks.
 *  - the source says "Please share this survey" but has no link to a survey anywhere on the page, so
 *    none is added. Where the survey is needs to be found (GitHub issue #141).
 *  - text is verbatim; non-breaking spaces become ordinary spaces and trailing spaces are trimmed.
 *  - alt text: the source has none; it is written from looking at each image.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'bike-park-project'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

const IMAGES = {
  gallery1: {file: 'image-4.jpg', alt: 'Rider on a berm at a wooded mountain bike park', caption: 'highlandmountain.com'},
  gallery2: {
    file: 'Prefab-Wood.jpeg',
    alt: 'Child on a balance bike crossing a wooden skills bridge',
    caption: 'americanrampcompany.com',
  },
  // The 1024px rendition: the original is 2.8 MB.
  gallery3: {
    file: 'Adaptive-trails_e-1024x682.png',
    alt: 'Two riders on a dirt berm at a bike park',
    caption: 'highfivesfoundation.org',
  },
  gallery4: {file: 'XC-Courrse-2.jpg', alt: 'Rider on a mountain bike crossing a log feature', caption: ''},
  site: {
    file: 'BikeParkSite-2-edited.png',
    alt: 'Aerial map of the project site off Milestone Road, outlined in red',
    caption: '',
  },
  disturbance: {
    file: '1995Disturbance-1.png',
    alt: 'Black and white aerial view of the project site in 1995, outlined in red',
    caption: '1995',
  },
  existing: {
    file: 'ExistingConditions-1.jpg',
    alt: 'Aerial photo of the cleared sandy area within the pine woods at the site',
    caption: '',
  },
  connection: {
    file: 'Screenshot-2025-10-21-110457.png',
    alt: 'Map showing the site beside Milestone Road, near the Middle Moors trails',
    caption: '',
  },
} as const
type ImageName = keyof typeof IMAGES

const VIDEO_URL = 'https://www.youtube.com/watch?v=zSJiWOtKftY'
const VIDEO_TITLE = 'Land Bank Bike Park Public Meeting - June 18, 2024'

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({_type: 'span', _key: key, text, marks})

type Style = 'normal' | 'h2' | 'h3'
const block = (key: string, style: Style, children: Span[], listItem?: 'bullet') => ({
  _type: 'block',
  _key: key,
  style,
  markDefs: [],
  ...(listItem ? {listItem, level: 1} : {}),
  children,
})
const text = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, value)])
const heading = (key: string, value: string, style: 'h2' | 'h3' = 'h2') => block(key, style, [span(`${key}-s`, value)])
const bullet = (key: string, value: string) => block(key, 'normal', [span(`${key}-s`, value)], 'bullet')

/** A Media & text block: one paragraph beside an image on the left, at body size. */
const mediaRow = (key: string, content: string, assetId: string, name: ImageName) => ({
  _type: 'mediaText',
  _key: key,
  size: 'body',
  imagePosition: 'left',
  content: [text(`${key}-t`, content)],
  image: {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
    alt: IMAGES[name].alt,
    ...(IMAGES[name].caption ? {caption: IMAGES[name].caption} : {}),
  },
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
  for (const {file} of Object.values(IMAGES)) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): body with 6 H2 sections, ` +
      `1 image gallery (4), 4 Media & text rows, 1 video, ${Object.keys(IMAGES).length} images; existing image kept.`,
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const ids = {} as Record<ImageName, string>
  for (const [name, image] of Object.entries(IMAGES) as Array<[ImageName, (typeof IMAGES)[ImageName]]>) {
    ids[name] = (await client.assets.upload('image', await download(image.file), {filename: image.file}))._id
  }
  const galleryImage = (key: string, name: ImageName) => ({
    _type: 'galleryImage',
    _key: key,
    asset: {_type: 'reference', _ref: ids[name]},
    alt: IMAGES[name].alt,
    ...(IMAGES[name].caption ? {caption: IMAGES[name].caption} : {}),
  })

  const body = [
    text(
      'intro',
      'One of the three pillars of the Land Bank’s mission is to create outdoor recreational opportunities for residents and visitors. Despite there being a thriving culture of biking on the island, there is no existing bike park where people can build and practice skills to be used both on and off the island. The Land Bank is exploring creating a bike park for all ages and abilities to fill this need – read on to learn more!',
    ),
    heading('h-what', 'What is a Bike Park?'),
    text(
      'what-1',
      'A bike park is an area or park dedicated to biking. Bike parks can come in many different sizes and configurations and may include a variety of features such as skills courses, pump tracks, trails, jumps, and more.',
    ),
    {
      _type: 'imageGallery',
      _key: 'gallery',
      images: [
        galleryImage('g1', 'gallery1'),
        galleryImage('g2', 'gallery2'),
        galleryImage('g3', 'gallery3'),
        galleryImage('g4', 'gallery4'),
      ],
    },
    heading('h-goals', 'Project Goals'),
    bullet('goal-1', 'Create an area where people of all ages and abilities can have fun and progress in bike skills.'),
    bullet('goal-2', 'Create features that aren’t available anywhere else on the island.'),
    bullet('goal-3', 'Provide a place for kids and teenagers to practice skills.'),
    bullet('goal-4', 'Incorporate unique bike park elements to support bike skill development and confidence.'),
    text(
      'goals-note',
      'Public input is vital to the success of this project, and these goals may evolve to align with our community’s needs. The feedback we receive could also influence the scale and types of features we will incorporate into this park.',
    ),
    heading('h-site', 'Project Site'),
    mediaRow(
      'site-1',
      'The site being considered for this project is a Land Bank property located on Milestone Road just past Tetawkimmo Drive.',
      ids.site,
      'site',
    ),
    mediaRow(
      'site-2',
      'This location was previously disturbed and is a popular area for mountain bikers.',
      ids.disturbance,
      'disturbance',
    ),
    mediaRow(
      'site-3',
      'Here you can see the current property conditions. We hope to integrate the park and its features into the surrounding landscape as much as possible and as such, will be reviewing the existing natural attributes of the property carefully.',
      ids.existing,
      'existing',
    ),
    mediaRow(
      'site-4',
      'This location provides connectivity from the bike path to the middle moors. Visitors will be able to access the park from these trail networks and/or use the park as a warmup before a longer ride into the middle moors and beyond.',
      ids.connection,
      'connection',
    ),
    heading('h-design', 'Design Approach'),
    block('design-1', 'normal', [
      span(
        'design-1-a',
        'The design approach is to create a fun environment with a variety of experiences for all ages and abilities. Our target audience for this park spans from ',
      ),
      span('design-1-b', 'young children', ['strong']),
      span('design-1-c', ' who are just starting to ride a bike and need to develop skills and confidence '),
      span('design-1-d', 'to older and experienced riders', ['strong']),
      span(
        'design-1-e',
        ' who want features that challenge them and add a level of excitement. We will incorporate a broad range of bike park elements, so users can revisit the park for years to come and still feel challenged.',
      ),
    ]),
    heading('h-adaptive', 'Adaptive Trail Considerations', 'h3'),
    text(
      'adaptive-1',
      'Adaptive cycling is quite popular, and adaptive bicycles can go on virtually any trail within certain parameters, such as the width of a bridge or the width between two trees. We will be assimilating accessibility features into this design.',
    ),
    heading('h-other', 'Other Considerations', 'h3'),
    text(
      'other-1',
      'This park will serve as a community space, and there is potential to add structures for small and/or large gatherings (e.g., places for parents to watch their children, for events, etc.). We are also exploring the idea of including other elements, such as lighting, parking, a walking loop, and more.',
    ),
    heading('h-next', 'What’s Next?'),
    text(
      'next-1',
      'We are in the first phase of this project and are seeking community feedback on what the public wants to see at this park.',
    ),
    text(
      'next-2',
      'Please share this survey with your friends, family, and fellow cyclists! Your input is valued and will help ensure that this new community resource is a place that everyone loves.',
    ),
    text(
      'next-3',
      'Once we have compiled this first round of feedback, our design team will draw up plans and concepts, which we will present to the community for further feedback.',
    ),
    heading('h-learn', 'Learn More'),
    text('learn-1', 'Watch the Community Meeting we held via Zoom on June 18th to learn more!'),
    {_type: 'videoEmbed', _key: 'meeting-video', url: VIDEO_URL, title: VIDEO_TITLE},
  ]

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    body,
  } as never)
  console.log(`+ created ${created._id} (${Object.keys(ids).length} images)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
