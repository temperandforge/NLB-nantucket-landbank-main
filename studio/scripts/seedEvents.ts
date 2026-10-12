/**
 * Seeds the four example events from the Figma events list (node 2613:32039) as DRAFT `event`
 * documents. Nothing is published.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedEvents.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedEvents.ts --with-user-token
 *
 * What it writes: one draft `event` per entry below (title, slug, start, end, location,
 * description and, where the Figma event page has them, page content; Sanity generates the id).
 * Idempotent: an event is matched on its slug among published documents and drafts and skipped if
 * it exists, so it never edits an existing event. Images are not seeded (the shell cannot download
 * Figma's photos): add them in Studio. Times are America/New_York (EDT, UTC-4 in all four months),
 * stored as UTC ISO strings.
 *
 * Family Picnic Day follows the event page (Figma 1910:15146): Wednesday July 22nd, 10:30 am -
 * 3:00 pm, Oak Memorial Park, with its Activities and Rain Date sections as page content.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

/** Portable Text for the page content: a heading is an H2 block, everything else a paragraph. */
const text = (style: 'normal' | 'h2', value: string) => ({
  _type: 'block',
  _key: randomUUID().slice(0, 8),
  style,
  markDefs: [],
  children: [{_type: 'span', _key: randomUUID().slice(0, 8), text: value, marks: []}],
})

const EVENTS: Array<{
  title: string
  body?: ReturnType<typeof text>[]
  start: string
  end: string
  location: string
  description: string
}> = [
  {
    title: 'Miacomet Golf Jamboree',
    start: '2026-08-04T10:30:00-04:00',
    end: '2026-08-04T15:00:00-04:00',
    location: 'Miacomet Golf Course',
    description:
      'A fun-filled day on the fairways of Miacomet Golf Course where golfers of all ages and abilities come together to enjoy one of the Land Bank’s most beloved recreational properties and the sport that has been a part of Nantucket’s culture for over a century.',
  },
  {
    title: 'Coastal Cleanup Day',
    start: '2026-07-15T10:30:00-04:00',
    end: '2026-07-15T17:00:00-04:00',
    location: 'Cinco Beach',
    description:
      'A hands-on opportunity for islanders and visitors alike to give back to the shorelines and open spaces they love, rolling up their sleeves to protect Nantucket’s coastal ecosystems for generations to come.',
  },
  {
    title: 'Family Picnic Day',
    start: '2026-07-22T10:30:00-04:00',
    end: '2026-07-22T15:00:00-04:00',
    location: 'Oak Memorial Park',
    description:
      'A gathering for families and community members to celebrate over 40 years of Land Bank conservation, recreation, and agriculture as well as welcoming the summer season together',
    body: [
      text('h2', 'Activities'),
      text(
        'normal',
        'Family Picnic Days take place at rotating Land Bank properties throughout the summer, giving families a chance to explore different corners of the island’s protected landscape. Each event features designated picnic areas with scenic views, short self-guided nature trails suitable for all ages, and activity sheets for younger visitors curious about the plants, birds, and insects they might encounter along the way. Land Bank staff will be on hand to answer questions, point out points of interest, and share what makes each property special.',
      ),
      text(
        'normal',
        'Everyone. Family Picnic Days are free, open to the public, and designed to be accessible and enjoyable whether you’re a lifelong Nantucket resident or visiting the island for the first time. Leashed dogs are welcome. Families with young children, grandparents, and everyone in between will find something to enjoy.',
      ),
      text(
        'normal',
        'Come prepared with plenty of water, sunscreen, and whatever you love to eat outside. Comfortable walking shoes are recommended if you plan to explore the trails. Leave no trace — please pack out everything you bring in, and help us keep these lands beautiful for the next family that comes along.',
      ),
      text('h2', 'Rain Date'),
      text(
        'normal',
        'We know Nantucket weather has a mind of its own. In the event of rain or unfavorable conditions, Family Picnic Days will be rescheduled to the rain date listed at the time of registration. Updates will be posted on our website and sent to registered participants by email the morning of the event. When in doubt, check our events calendar or reach out to us directly — we’ll always have the most current information there.',
      ),
    ],
  },

  {
    title: 'Sunset at Settler’s Landing',
    start: '2026-05-22T20:30:00-04:00',
    end: '2026-05-22T22:00:00-04:00',
    location: 'Settler’s Landing',
    description:
      'An evening gathering at one of Nantucket’s most storied Land Bank properties, where guests can soak in sweeping harbor views, connect with the island’s rich history, and share in the quiet beauty.',
  },
]

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function main() {
  const existing = await client.fetch<Array<{slug?: string}>>(
    `*[_type == "event"]{"slug": slug.current}`,
  )
  const taken = new Set(existing.flatMap((doc) => (doc.slug ? [doc.slug] : [])))

  let created = 0
  for (const event of EVENTS) {
    const slug = toSlug(event.title)
    if (taken.has(slug)) {
      console.log(`  = ${slug}: already exists, left alone`)
      continue
    }
    const start = new Date(event.start).toISOString()
    if (DRY_RUN) {
      console.log(`  [dry run] would create draft "${event.title}" (${start})`)
    } else {
      // A `drafts.` id makes this a draft; Sanity generates the id after it.
      const doc = await client.create({
        _id: 'drafts.',
        _type: 'event',
        title: event.title,
        slug: {_type: 'slug', current: slug},
        start,
        end: new Date(event.end).toISOString(),
        location: event.location,
        description: event.description,
        ...(event.body ? {body: event.body} : {}),
      })
      console.log(`  + ${slug} (${doc._id})`)
    }
    created++
  }
  console.log(
    `${DRY_RUN ? 'Would create' : 'Created'} ${created} draft event(s); ${EVENTS.length - created} already existed.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
