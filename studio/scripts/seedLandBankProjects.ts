/**
 * Seeds the Land Bank's projects, as listed on https://www.nantucketlandbank.org/about/projects/
 * (11 of them), as DRAFT `project` documents. Nothing is published.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedLandBankProjects.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedLandBankProjects.ts --with-user-token
 *
 * What it writes: one draft `project` per entry below (name, slug, description; Sanity generates
 * the id). Idempotent: a project is matched on its slug among published documents and drafts and
 * skipped if it exists, so it never edits an existing project. It writes no images, no project
 * types and no property references - the source page has none to copy - so add those in Studio.
 * Projects have a page of their own (/projects/<slug>), so they carry no link field.
 *
 * Descriptions are the page's own teaser text, copied as written.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const PROJECTS: Array<{name: string; description: string}> = [
  {
    name: 'Lily Pond Park Project',
    description:
      'Lily Pond Park is a 6.5-acre parcel owned and managed by the Land Bank located just west of downtown Nantucket, in the Nantucket Harbor Watershed. The Lily Pond Improvement Project was designed by the Horsley Witten Group in collaboration with the Land Bank to improve the hydraulic, ecological and recreational function of Lily Pond Park.',
  },
  {
    name: 'Mill Hill Park Revitalization Project',
    description:
      'The Nantucket Land Bank is delighted to restore Mill Hill Park’s natural beauty and update its amenities for public use across this 19.25-acre open space, treasured by the community since 1912.',
  },
  {
    name: '41 Jefferson Avenue Beach Project',
    description:
      'The NLB is excited to advance plans to relocate the existing structures at 41 Jefferson Avenue in order to restore the public beach and expand parking. Planned improvements include: New accessible parking spaces, Mobimats or a boardwalk for easier beach access, and a small dune system designed to help retain sand and protect the shoreline. These efforts aim to create a beach experience that is welcoming and accessible for all.',
  },
  {
    name: '41 Jefferson Houses ReUse Project',
    description:
      'The 41 Jefferson ReUse initiative reflects a shared commitment to sustainability, community partnership, and creative solutions to Nantucket’s housing challenges. By relocating and reusing existing structures instead of demolishing them, the project reduces waste, preserves historical character, and expands access to much‑needed housing options.',
  },
  {
    name: 'Maintenance Facility Project',
    description:
      'Due to the Land Bank’s gradually expanding portfolio since our inception in 1983, we have seen a need to increase our staff and equipment to meet the demands of improving and maintaining these publicly accessible properties.',
  },
  {
    name: 'Forest Management Project',
    description:
      'Active management will not only make our forest more resilient to the threats of southern pine beetle and wildfire, but will also increase biodiversity and restore the pine barren habitat at this site.',
  },
  {
    name: 'Community Garden',
    description:
      'The Land Bank created a new Community Garden behind the Discovery Playground at 50 Old South Road. Our goal is to provide a source of inexpensive and nutritious food, an opportunity for physical outdoor activity, and a source of personal and community pride for year-round island residents.',
  },
  {
    name: 'Land Bank Rain Garden',
    description:
      'The Land Bank Rain Garden (located at 65 & 67 Easton St) was developed by the Horsley Witten Group in collaboration with the Land Bank to better absorb and filter stormwater runoff before entering our harbor via storm drains. The park was officially opened to the public on July 31, 2024!',
  },
  {
    name: 'Washington Street Resilience Framework Plan',
    description:
      'A joint project between the Town and the Land Bank for Washington Street to increase the longevity of this transportation corridor and help mitigate current and future flooding.',
  },
  {
    name: 'Cisco Beach Parking Lot Relocation',
    description:
      'Winter storms caused major erosion at Cisco Beach, resulting in the closure of the front parking section. Click to read about the Land Bank’s plans to ensure continued beach access at this property.',
  },
  {
    name: 'Bike Park Project',
    description:
      'One of the three pillars of the Land Bank’s mission is to create outdoor recreational opportunities for residents and visitors, and we are currently exploring creating a bike park for all ages and abilities.',
  },
]

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function main() {
  const existing = await client.fetch<Array<{_id: string; slug?: string}>>(
    `*[_type == "project"]{_id, "slug": slug.current}`,
  )
  const taken = new Set(existing.flatMap((doc) => (doc.slug ? [doc.slug] : [])))

  let created = 0
  for (const {name, description} of PROJECTS) {
    const slug = toSlug(name)
    if (taken.has(slug)) {
      console.log(`  = ${slug}: already exists, left alone`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  [dry run] would create draft ${slug}`)
    } else {
      // A `drafts.` id makes this a draft; Sanity generates the id after it.
      const doc = await client.create({
        _id: 'drafts.',
        _type: 'project',
        name,
        slug: {_type: 'slug', current: slug},
        description,
      })
      console.log(`  + ${slug} (${doc._id})`)
    }
    created++
  }
  console.log(`${DRY_RUN ? 'Would create' : 'Created'} ${created} draft project(s); ${PROJECTS.length - created} already existed.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
