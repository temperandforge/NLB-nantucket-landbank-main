/**
 * Creates the Staff, Commissioners and FAQs pages as DRAFTS under the existing About Us page, and a
 * top-level Projects page, each built from blocks (a header, then the people, questions or projects).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedArchivePages.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedArchivePages.ts --with-user-token
 *
 * What it writes: four draft `page` documents (Sanity generates every id) and, for the FAQs hero,
 * one uploaded sample photo (content-addressed, so re-running reuses it; replace it in Studio).
 * Idempotent: a page is matched on its slug under the About Us page, in any state, and skipped if
 * it exists. It never edits an existing page and creates no parent: it stops if About Us is
 * missing. The parent reference is weak, so it holds whether or not About Us is published.
 *
 * The header copy is the theme's own defaults. The pages show whatever staff, commissioner and FAQ
 * documents exist (see seedPhaseBContent.ts for samples); importing the real ones is #11.
 */

import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const published = (id: string) => id.replace(/^drafts\./, '')

const STAFF_BODY =
  "The Land Bank staff works every day to protect, manage, and open Nantucket's natural landscapes to the public. From stewardship and trail maintenance to land acquisition and community programming, our team brings deep knowledge of the island and a genuine commitment to keeping it wild, working, and accessible for everyone who calls Nantucket home."
const PROJECTS_BODY =
  "The Land Bank's conservation work is always evolving. Our projects page is where you'll find an inside look at the active initiatives shaping the future of Nantucket's protected lands — from habitat restoration and invasive species management to trail improvements, wildlife monitoring, and community partnerships. Some projects span a single season; others are years in the making. All of them reflect our commitment to not just protecting land, but actively caring for it. Explore what we're working on below."
const COMMISSIONER_BODY =
  "The Land Bank is governed by a five-member Board of Commissioners, elected by Nantucket voters to oversee the acquisition, management, and stewardship of the island's protected lands. Commissioners bring a range of backgrounds and a shared commitment to conservation, working alongside Land Bank staff to ensure that every acre we protect continues to serve the community."

async function uploadSampleImage() {
  if (DRY_RUN) return 'dry-image'
  const path = resolve(__dirname, '../../frontend/public/images/properties/long-pond.jpg')
  return (await client.assets.upload('image', createReadStream(path), {filename: 'long-pond.jpg'}))._id
}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "about-us"][0]._id`,
  )
  if (!parent) {
    console.error('There is no "about-us" page to put the archives under. Nothing was written.')
    process.exit(1)
  }
  const parentId = published(parent)

  const pages: Array<{slug: string; name: string; topLevel?: boolean; blocks: () => Promise<unknown[]>}> = [
    {
      slug: 'projects',
      name: 'Projects',
      topLevel: true,
      blocks: async () => [
        {_type: 'heroTertiary', _key: key(), eyebrow: 'Projects', heading: 'See all our projects', headingLevel: 'h1', body: PROJECTS_BODY},
        {_type: 'projectGrid', _key: key(), showFilters: true},
      ],
    },
    {
      slug: 'staff',
      name: 'Staff',
      blocks: async () => [
        {_type: 'heroTertiary', _key: key(), eyebrow: 'Staff', heading: 'Meet our staff', headingLevel: 'h1', body: STAFF_BODY},
        {_type: 'peopleGrid', _key: key(), source: 'staff', showFilters: true},
      ],
    },
    {
      slug: 'commissioners',
      name: 'Commissioners',
      blocks: async () => [
        {_type: 'heroTertiary', _key: key(), eyebrow: 'Commissioners', heading: 'Meet our Commissioners', headingLevel: 'h1', body: COMMISSIONER_BODY},
        {_type: 'peopleGrid', _key: key(), source: 'commissioners'},
      ],
    },
    {
      slug: 'faqs',
      name: 'FAQs',
      blocks: async () => [
        {
          _type: 'heroImage',
          _key: key(),
          eyebrow: 'FAQs',
          heading: 'Have questions? We have the answers.',
          image: {
            _type: 'image',
            asset: {_type: 'reference', _ref: await uploadSampleImage()},
            alt: 'A Land Bank property',
          },
        },
        {
          _type: 'faqList',
          _key: key(),
          heading: 'FAQs',
          description: 'Have questions? No worries, we have the answers.',
        },
      ],
    },
  ]

  let created = 0
  for (const page of pages) {
    const exists = await client.fetch<string | null>(
      page.topLevel
        ? `*[_type == "page" && slug.current == $slug && !defined(parent)][0]._id`
        : `*[_type == "page" && slug.current == $slug && parent._ref == $parent][0]._id`,
      {slug: page.slug, parent: parentId},
    )
    if (exists) {
      console.log(`  = exists: ${page.topLevel ? '' : 'about-us/'}${page.slug} (${exists})`)
      continue
    }
    created += 1
    if (DRY_RUN) {
      console.log(`[dry run] would create draft page ${page.topLevel ? '' : 'about-us/'}${page.slug}`)
      continue
    }
    const result = await client.create({
      _id: 'drafts.',
      _type: 'page',
      name: page.name,
      slug: {_type: 'slug', current: page.slug},
      ...(page.topLevel
        ? {}
        : {
            parent: {
              _type: 'reference',
              _ref: parentId,
              _weak: true,
              _strengthenOnPublish: {type: 'page'},
            },
          }),
      pathOnly: false,
      pageBuilder: await page.blocks(),
    } as never)
    console.log(`  + created draft: ${page.topLevel ? '' : 'about-us/'}${page.slug} (${result._id})`)
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} draft page(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
