/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/about/projects/community-garden/
 * into the existing `project` with slug `community-garden` (page at /projects/community-garden).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importCommunityGarden.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importCommunityGarden.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `image` and `body`), the hero image and Toscana logo as image assets, and the garden
 * policy PDF as a file asset, all downloaded from the live site. The published project is NOT
 * modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description` or `projectTypes`.
 * --dry prints the plan, checks every asset resolves, and writes and uploads nothing. The project
 * must already exist (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - image: the page's first photo (also its og:image) is the project image and is NOT repeated in
 *    the body. The source gives it no alt text; "Community Garden" is a placeholder to improve.
 *  - description: kept as seeded. It is the listing teaser; the page's opening paragraph is body.
 *  - sections: the four section headings (Garden Policies, Community Garden Lottery, Garden
 *    Location, Land Bank Community Garden Committee) are H2 and so become the page's jump nav. The
 *    "Thank you Toscana..." line is a styled H2 in the source but is a callout beside a logo, not a
 *    section, so it is a normal paragraph under the logo and stays out of the nav.
 *  - policy PDF: uploaded to Sanity and linked from there, so the link survives the old site's
 *    retirement. Source file name (including "DRAFT") is kept as is.
 *  - map: the Google Map embed becomes an `embed` block under Garden Location, using the same
 *    address the source embeds (50 Old South Road).
 *  - NOT migrated: the six-photo gallery, which the source hides at every screen size.
 *  - text is otherwise verbatim; non-breaking spaces are collapsed to ordinary spaces.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'community-garden'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'
const HERO = {file: '3F0A5678-copy-scaled.jpg', alt: 'Community Garden'}
const TOSCANA = {file: 'Toscana-1.png', alt: 'Toscana'}
const POLICY_PDF = 'NLB-Community-Garden-Policy-DRAFT-032924.pdf'
const MAP_URL =
  'https://maps.google.com/maps?q=50%20Old%20South%20Road%2C%20Nantucket%2C%20MA&z=16&hl=en&t=m&output=embed&iwloc=near'
const APPLY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSck8vSFNbI2GdOYquIRwWZ_JzLBkY3g0iCkSlj-Zdr7674XYg/viewform?usp=sharing'

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
const linkParagraph = (key: string, label: string, href: string) =>
  block(key, 'normal', [span(`${key}-s`, label, [`${key}-l`])], [
    {_type: 'link', _key: `${key}-l`, linkType: 'href', href, openInNewTab: true},
  ])

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
  for (const file of [HERO.file, TOSCANA.file, POLICY_PDF]) {
    const response = await fetch(`${UPLOADS}/${file}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${file} does not resolve (${response.status}); nothing written.`)
  }

  console.log(
    `Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): image ${HERO.file}, body with 4 H2 sections, ` +
      `Toscana logo ${TOSCANA.file}, policy PDF ${POLICY_PDF}.`,
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const hero = await client.assets.upload('image', await download(HERO.file), {filename: HERO.file})
  const logo = await client.assets.upload('image', await download(TOSCANA.file), {filename: TOSCANA.file})
  const pdf = await client.assets.upload('file', await download(POLICY_PDF), {
    filename: POLICY_PDF,
    contentType: 'application/pdf',
  })

  const body = [
    text(
      'intro',
      'The Land Bank opened a new Community Garden last year behind the Discovery Playground at 50 Old South Road. Our goal is to provide a source of inexpensive and nutritious food, an opportunity for physical outdoor activity, and a source of personal and community pride for year-round island residents. If we receive overwhelming interest for additional Community Garden plots, the Land Bank will explore other locations to expand community gardens on the island.',
    ),
    heading('h-policies', 'Garden Policies'),
    linkParagraph('policies-link', 'Click here to read our Garden Policies.', pdf.url),
    imageBlock('toscana-logo', logo._id, TOSCANA.alt),
    text('toscana-thanks', 'Thank you Toscana for generously donating compost for the garden beds!'),
    heading('h-lottery', 'Community Garden Lottery'),
    text(
      'lottery-text',
      'The lottery system will be random with priority given to households without access to land on which to garden. The first drawing will include those entries. If there are more plots available after the first drawing, a second drawing will be conducted from the remaining pool of applicants. Garden plots are free to use if you are selected.',
    ),
    linkParagraph('lottery-apply', 'Click Here to Apply!', APPLY_URL),
    heading('h-location', 'Garden Location'),
    {
      _type: 'embed',
      _key: 'location-map',
      url: MAP_URL,
      title: 'Map of the Community Garden, 50 Old South Road',
      shape: 'wide',
    },
    heading('h-committee', 'Land Bank Community Garden Committee'),
    text(
      'committee-text',
      'Thank you to our Community Garden Committee members for their advisement and assistance in this pilot program!',
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
  console.log(`+ created ${created._id} (image ${hero._id}, logo ${logo._id}, pdf ${pdf._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
