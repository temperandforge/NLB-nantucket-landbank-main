/**
 * Migrates one WordPress page, https://www.nantucketlandbank.org/maintenance-facility/ into the
 * existing `project` with slug `maintenance-facility-project` (page at
 * /projects/maintenance-facility-project; the old page was not under /about/projects/).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importMaintenanceFacility.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importMaintenanceFacility.ts --with-user-token
 *
 * What it writes: ONE draft revision of the existing project (`drafts.<id>`, a copy of the published
 * document plus `body`). No images or files are involved: the source page has none. The published
 * project is NOT modified; an editor reviews the draft and publishes it.
 *
 * Idempotent and non-destructive: if the project already has a draft, or already has a body, the
 * script stops and edits nothing. It never overwrites `name`, `slug`, `description`, `image` or
 * `projectTypes`. --dry prints the plan and writes nothing. The project must already exist
 * (seedLandBankProjects.ts creates it).
 *
 * Decisions:
 *  - no cover image: the project has none and the source page has no image to use. One needs adding
 *    in Studio (a photo of the Somerset Road or Hummock Pond Road site, or a rendering).
 *  - the source has no headings, so the page is its seven paragraphs in order, with no jump nav.
 *  - the contact address is a mailto link. In the source the link text carries the sentence's full
 *    stop ("eantonietti@nantucketlandbank.org."); the stop is outside the link here.
 *  - text is verbatim, including the source's "which has lead to" (sic) and "year- round" (stray
 *    space); non-breaking spaces become ordinary spaces.
 *  - no SEO overrides: none were read from the source.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'maintenance-facility-project'

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

  console.log(`Plan: draft revision of ${published._id} ("${published.name}", /projects/${SLUG}): body of 7 paragraphs, no images.`)
  if (DRY_RUN) {
    console.log('[dry run] nothing written.')
    return
  }

  const body = [
    text(
      'p1',
      'As most Nantucketers are aware, the Land Bank’s property portfolio has gradually expanded since our inception in 1983. As a result, we have seen a need to increase our staff and equipment to meet the demands of improving and maintaining these publicly accessible properties, whether they are for open space, agricultural, or recreational purposes. Our staff is remarkable for their broad array of qualifications, which result in responsible stewardship of Land Bank public assets. More staff and complex equipment means more space to house, repair, and protect these assets, which has lead to our industrious Property Maintenance and Resource Departments having outgrown our existing infrastructure. In addition, the Land Bank Commission is dedicated to providing affordable year- round housing for our employees at a time when this is increasingly hard to come by. For all these reasons, we have procured the services of an Owners Project Manager (ACG) and a Design Team (SMRT) to collaborate in the planning, design, bidding, and construction of a multi-stage project to replace existing derelict structures with new more suitable structures on two properties which constitute our Maintenance Campus.',
    ),
    text(
      'p2',
      'At 125 Somerset Road, our Maintenance Facility headquarters, we have designed and are currently procuring construction services to build a 2,850+/-sf, mixed-use, wood frame, 2-story building with a 3-bay garage for vehicle/equipment storage on the ground floor and office spaces on the 2nd floor. The 2nd floor will serve as much needed office and meeting space for our Resource Department.',
    ),
    text(
      'p3',
      'At 166 Hummock Pond Road, a portion of which is our satellite maintenance campus, we will be replacing an existing single-story dwelling with a 2-story modular Employee Housing Duplex, each with 3 bedrooms and an unfinished basement.',
    ),
    text(
      'p4',
      'We will also be replacing a concrete masonry garage with a 2,350+/- sf, single story, wood frame, unconditioned 5 bay storage garage to house vehicles and machinery used to keep our properties pristine and safe.',
    ),
    text(
      'p5',
      'We have been procuring these construction related services over the past few months with the goal of getting shovels in the ground in early 2026. Our goal is to have the duplex habitable and the storage garage and mixed use structure ready for use by Fall 2026.',
    ),
    text(
      'p6',
      'The Land Bank Commission is very pleased to be able to satisfy the needs of our growing staff on both professional and housing fronts while simultaneously supporting the ongoing upkeep of some of our islands most stunning natural spaces.',
    ),
    block(
      'p7',
      [
        span('p7-a', 'If you have any questions about these projects, please contact Eleanor Antonietti at '),
        span('p7-b', 'eantonietti@nantucketlandbank.org', ['mail-link']),
        span('p7-c', '.'),
      ],
      [{_type: 'link', _key: 'mail-link', linkType: 'href', href: 'mailto:eantonietti@nantucketlandbank.org'}],
    ),
  ]

  const {_id: _publishedId, _createdAt, _updatedAt, _rev, ...fields} = published as Record<string, unknown>
  const created = await client.create({
    ...fields,
    _id: `drafts.${published._id}`,
    _type: 'project',
    body,
  } as never)
  console.log(`+ created ${created._id}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
