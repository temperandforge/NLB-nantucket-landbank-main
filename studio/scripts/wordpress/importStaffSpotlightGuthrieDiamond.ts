/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/staff-spotlight-guthrie-diamond/ to a
 * DRAFT `article` at /news/staff-spotlight-guthrie-diamond.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importStaffSpotlightGuthrieDiamond.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importStaffSpotlightGuthrieDiamond.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and three image assets downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan (and checks that each image URL resolves) but writes and uploads nothing.
 *
 * Decisions:
 *  - date: the original publish date (2024-01-31). WordPress also shows 2024-02-01, not used.
 *  - image (required on an article): the post's first image ("Guthrie and her dog, Clover") is the
 *    article image, so it is NOT repeated in the body. The other two photos stay in the body, in
 *    their original positions: the transect photo before the intro, the Burchell Farm oak photo under
 *    the favorite-property question.
 *  - image sizes: the post embeds WordPress's resized copies (e.g. -225x300). The full-size original
 *    is tried first (the size suffix removed, or the `-scaled` file the post links to) and the embedded
 *    URL is the fallback.
 *  - headings: the seven interview questions are H2 in WordPress and become Heading 3 (the editor
 *    offers nothing higher), as in the Cross-Island Hike migration.
 *  - categories: the post is filed under News only, which is the section, not a `newsCategory`.
 *  - the body is verbatim, including the source's editorial [brackets] and "in depth".
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'staff-spotlight-guthrie-diamond'
const TITLE = 'Staff Spotlight: Guthrie Diamond'
const DATE = '2024-01-31'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

type ImageSpec = {filename: string; alt: string; candidates: string[]}

const HERO: ImageSpec = {
  filename: 'IMG_5817.jpg',
  alt: 'Guthrie and her dog, Clover',
  candidates: [`${UPLOADS}/IMG_5817-scaled.jpg`, `${UPLOADS}/IMG_5817-1024x768.jpg`],
}
const TRANSECT: ImageSpec = {
  filename: 'Guthrie-transect.jpg',
  alt: 'Guthrie holding a transect',
  candidates: [`${UPLOADS}/Guthrie-transect.jpg`, `${UPLOADS}/Guthrie-transect-225x300.jpg`],
}
const OAK: ImageSpec = {
  filename: 'guthrie-with-burchell-oak-tree.jpg',
  alt: 'Guthrie with the Oak Tree at Burchell Farm',
  candidates: [`${UPLOADS}/guthrie-with-burchell-oak-tree.jpg`, `${UPLOADS}/guthrie-with-burchell-oak-tree-225x300.jpg`],
}

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}

function textBlock(key: string, style: 'normal' | 'h3', text: string) {
  const children: Span[] = [{_type: 'span', _key: `${key}-s`, text, marks: []}]
  return {_type: 'block', _key: key, style, markDefs: [], children}
}

const QA: Array<[string, string]> = [
  [
    'Tell us about your background.',
    'I grew up in upstate New York near Albany, not too far from the Adirondacks, which really instilled in me a love for the environment. I went to Brandeis University in Massachusetts where I studied Environmental Studies and Health: Science, Society, and Policy. Now, I live on Nantucket with my dog Clover, who is just the sweetest girl!',
  ],
  [
    'When did you start working for the Land Bank and what drew you to work here?',
    'I came to the Land Bank in May of 2019. I took the boat out here the day after my college graduation, and I feel so lucky to have struck gold with this job. When I had my interview with Rachael, she explained how the Land Bank’s work benefits the community in addition to the environment, and that really drew me in.',
  ],
  [
    'How would you describe your role and responsibilities?',
    'I oversee field ecology operations. Nantucket has a lot of rare plants and rare habitats, so I do surveys and habitat assessments to check up on those rare populations. [I do] a lot of invasive species work. I dabble in wetland work with soils and wetland delineations, water quality, checking HABs, mapping out trails, [and making] trail maps. In the off season, it’s a lot of writing reports on all the surveys we did last summer, and permitting for what we want to do next summer. Over the summer I get to work with our Field Crew on habitat management and oversee some of our seasonal staff.',
  ],
  [
    'What is the most interesting thing about your work for the Land Bank?',
    'Since Nantucket is a small island, there’s a lot of opportunity to get to know the Land Bank properties really well. I love getting to know the plant community on an in depth level. I also just love the public benefit. It’s so rewarding being able to see the impact of our work on the community.',
  ],
  [
    'What project are you most proud of completing?',
    'The project I’m most proud to be involved in is the Land Bank’s ongoing forest management program. The imminent threat of the southern pine beetle forced us to take a closer look at our forests. You can tell they’re overcrowded, and the trees are stressed out, [which results in] pine beetle and wildfire risk. I am so proud of how our team has worked together, from gathering all the scientific information so we can make informed decisions, gathering property-specific baseline data, knowing when we had to outsource and hire our forester, and then finally putting our plans into action at Gardner Farm.',
  ],
  [
    'What is your favorite Land Bank property and why?',
    'After much deliberation, because I love many Land Bank properties, my favorite is Beechwood Farm. There’s so much diversity of habitats there. Even just in one property we have some heathland and grassland areas, but we also have these amazing tupelo forests, a gorgeous wetland, and a lot of sassafras trees. One of the first projects that I was involved in was establishing the trail in the southern area of that property. I was involved in the wetland delineation and plant surveys for laying out the new trail, then it went through ConCom, and then our field crew finally installed that trail. That was so rewarding for me to see that whole process start to finish and see people getting to enjoy [the trail]. And most importantly, my favorite white oak tree on Nantucket is along the trail!',
  ],
  [
    'Tell us something people might not know about you!',
    'Well, it’s very bittersweet for me to share that I will be leaving the Land Bank in the Spring because I am going to UMass Amherst for a Master of Science in Environmental Conservation with a concentration in Forest Resources and Arboriculture. I’m so thankful for the time I’ve had at the Land Bank – I’ve learned so much. Our staff is incredible, and I just want to soak up all the amazing things about Nantucket and the Land Bank before I go.',
  ],
]

const INTRO =
  'Guthrie Diamond, Field Ecology Coordinator, has been with the Land Bank since 2019, and has a hand in almost all things environmental – from plant surveys to habitat management to creating maps, and so much more. Read on to learn more about her work at the Land Bank!'

/** Body blocks; image blocks hold a placeholder asset ref that `withAssets` fills in. */
function buildBody(assetIds: {transect: string; oak: string}) {
  const image = (key: string, spec: ImageSpec, assetId: string) => ({
    _type: 'image',
    _key: key,
    asset: {_type: 'reference', _ref: assetId},
    alt: spec.alt,
  })
  const blocks: object[] = [image('transect-image', TRANSECT, assetIds.transect), textBlock('intro', 'normal', INTRO)]
  QA.forEach(([question, answer], i) => {
    blocks.push(textBlock(`q${i + 1}`, 'h3', question))
    // The Burchell Farm oak photo opens the favorite-property answer.
    if (i === 5) blocks.push(image('oak-image', OAK, assetIds.oak))
    blocks.push(textBlock(`a${i + 1}`, 'normal', answer))
  })
  return blocks
}

/** The first candidate URL that responds OK. */
async function resolveUrl(spec: ImageSpec): Promise<string> {
  for (const url of spec.candidates) {
    const response = await fetch(url, {method: 'HEAD'})
    if (response.ok) return url
  }
  throw new Error(`None of these resolve for "${spec.filename}": ${spec.candidates.join(', ')}`)
}

async function upload(spec: ImageSpec, url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {filename: spec.filename})
  return asset._id
}

async function main() {
  const existing = await client.fetch<Array<{_id: string}>>(`*[_type == "article" && slug.current == $slug]{_id}`, {
    slug: SLUG,
  })
  if (existing.length > 0) {
    console.log(`= exists, left as is: ${existing.map((e) => e._id).join(', ')}`)
    return
  }

  const [heroUrl, transectUrl, oakUrl] = await Promise.all([HERO, TRANSECT, OAK].map(resolveUrl))
  const bodyBlocks = buildBody({transect: 'pending', oak: 'pending'}).length
  console.log(`Plan: draft article "${TITLE}" (/news/${SLUG}), ${DATE}, ${bodyBlocks} body blocks (2 images)`)
  console.log(`  article image: ${heroUrl}\n  body image:    ${transectUrl}\n  body image:    ${oakUrl}`)
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const heroId = await upload(HERO, heroUrl)
  const transectId = await upload(TRANSECT, transectUrl)
  const oakId = await upload(OAK, oakUrl)

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: heroId}, alt: HERO.alt},
    body: buildBody({transect: transectId, oak: oakId}),
  } as never)
  console.log(`+ created ${created._id} (images ${heroId}, ${transectId}, ${oakId})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
