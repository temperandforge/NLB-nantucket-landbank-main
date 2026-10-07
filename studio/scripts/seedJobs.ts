/**
 * Seeds the sample job openings from the Figma design and adds a Job Listings block to the
 * Connect With Us page, as DRAFTS only (nothing is published).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedJobs.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedJobs.ts --with-user-token
 *
 * What it writes: draft `job` documents, a draft `department` for each department that does not
 * exist yet (Sanity generates every id), and one `jobListings` block appended to the Connect With
 * Us page's pageBuilder. Idempotent: jobs and departments are matched on a natural key (title,
 * slug) among published documents and drafts and skipped if they exist, and the block is added
 * only if the page has no Job Listings block. It never edits an existing job or department. The
 * page is edited through its draft: if only a published version exists, the draft is created as a
 * copy of it with the block appended, so nothing goes live until you publish it in Studio.
 * Every "Apply now" link is the `#` placeholder until the real application address is known.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const slug = (current: string) => ({_type: 'slug', current})
const published = (id: string) => id.replace(/^drafts\./, '')
const weakRef = (id: string, type: string) => ({
  _type: 'reference' as const,
  _ref: id,
  _weak: true,
  _strengthenOnPublish: {type},
})

async function find(type: string, field: string, value: string) {
  const ids = await client.fetch<string[]>(`*[_type == $type && ${field} == $value]._id`, {type, value})
  return ids.length > 0 ? published(ids[0]) : null
}

let created = 0
async function ensure(type: string, field: string, value: string, doc: Record<string, unknown>) {
  const existing = await find(type, field, value)
  if (existing) {
    console.log(`  = exists: ${type} ${value}`)
    return existing
  }
  created += 1
  if (DRY_RUN) {
    console.log(`[dry run] would create ${type}: ${value}`)
    return `dry-${type}-${value}`
  }
  const result = await client.create({_id: 'drafts.', _type: type, ...doc} as never)
  console.log(`  + created draft ${type}: ${value} (${result._id})`)
  return published(result._id)
}

const applyLink = {_type: 'link', linkType: 'href', href: '#', openInNewTab: false}

async function main() {
  const administration = await ensure('department', 'slug.current', 'administration', {
    title: 'Administration',
    slug: slug('administration'),
    order: 10,
  })
  const property = await ensure('department', 'slug.current', 'property-management', {
    title: 'Property Management',
    slug: slug('property-management'),
    order: 20,
  })
  const environmental = await ensure('department', 'slug.current', 'environmental-agriculture', {
    title: 'Environmental & Agriculture',
    slug: slug('environmental-agriculture'),
    order: 30,
  })

  await ensure('job', 'title', 'Stewardship Manager', {
    title: 'Stewardship Manager',
    department: weakRef(property, 'department'),
    description:
      'Oversee the active management of Land Bank properties, including habitat restoration, invasive species control, trail maintenance, and wildlife monitoring. Work closely with conservation partners and coordinate volunteer and community programs.',
    location: 'In-Person',
    employmentType: 'Full Time',
    applyLink,
    order: 10,
  })
  await ensure('job', 'title', 'Conservation Internship', {
    title: 'Conservation Internship',
    department: weakRef(environmental, 'department'),
    description:
      'The Nantucket Land Bank conservation internship offers a hands-on introduction to land stewardship, habitat management, and community conservation. Interns work alongside our stewardship staff in the field — assisting with trail maintenance, invasive species removal, wildlife monitoring, and habitat restoration projects across our properties.',
    location: 'In-Person',
    employmentType: 'Full Time',
    applyLink,
    order: 20,
  })
  await ensure('job', 'title', 'Administrative Coordinator', {
    title: 'Administrative Coordinator',
    department: weakRef(administration, 'department'),
    description:
      'Support the day-to-day operations of the Land Bank office, including records management, public inquiries, event coordination, and assistance with property transfer documentation. The first point of contact for community members and a key part of keeping everything running smoothly.',
    location: 'In-Person',
    employmentType: 'Full Time',
    applyLink,
    order: 30,
  })

  // The block on the Connect With Us page.
  const pages = await client.fetch<Array<Record<string, any>>>(
    `*[_type == "page" && slug.current == "connect-with-us"]`,
  )
  if (pages.length === 0) {
    console.error('There is no "connect-with-us" page to add the block to. Jobs were still seeded.')
    process.exit(1)
  }
  const draft = pages.find((page) => page._id.startsWith('drafts.'))
  const page = draft ?? pages[0]
  const blocks: Array<Record<string, any>> = page.pageBuilder ?? []
  if (blocks.some((block) => block._type === 'jobListings')) {
    console.log(`  = exists: Job Listings block on connect-with-us (${page._id})`)
  } else {
    const block = {_type: 'jobListings', _key: key(), eyebrow: 'Job openings', heading: 'Join the Team'}
    if (DRY_RUN) {
      console.log(`[dry run] would add a Job Listings block to the ${draft ? 'draft' : 'published page, via a new draft'} (${page._id})`)
    } else if (draft) {
      await client.patch(draft._id).setIfMissing({pageBuilder: []}).append('pageBuilder', [block]).commit()
      console.log(`  + added Job Listings block to draft ${draft._id}`)
    } else {
      const {_createdAt, _updatedAt, _rev, ...copy} = page
      await client.create({...copy, _id: `drafts.${page._id}`, pageBuilder: [...blocks, block]} as never)
      console.log(`  + created draft of ${page._id} with the Job Listings block`)
    }
  }

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} draft document(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
