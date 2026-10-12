/**
 * Fills the Agriculture page's page builder from the Figma design (agriculture_desktop): a hero,
 * the left/right text, an image carousel of Agriculture projects, the growers grid and the news
 * preview.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedAgriculturePage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedAgriculturePage.ts --with-user-token
 *
 * What it writes: a DRAFT of the existing Agriculture page (`drafts.<id>`, a copy of the published
 * page with `pageBuilder` set), so the result is reviewed in Studio before anything goes live. It
 * overwrites nothing that is published. It stops if the page has no published version, if a draft
 * already exists (it would discard Studio edits), or if the published page already has blocks.
 *
 * Left empty on purpose: every image (the hero and the six growers) - the Figma photos expire and
 * were not downloaded, so add them in Studio; those fields are required and will be flagged until
 * filled. The three link items under "Farm to Table" use `#` placeholders: their destinations are
 * not known yet.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 12)

const block = (style: 'normal' | 'h3', text: string) => ({
  _key: key(),
  _type: 'block',
  style,
  markDefs: [],
  children: [{_key: key(), _type: 'span', marks: [], text}],
})

const placeholderLink = (label: string) => ({
  _key: key(),
  _type: 'anchorLink',
  icon: 'link',
  label,
  link: {_type: 'link', linkType: 'href', href: '#', openInNewTab: false},
})

const pageLink = (id: string) => ({
  _type: 'link',
  linkType: 'page',
  openInNewTab: false,
  page: {_type: 'reference', _ref: id},
})

async function main() {
  const page = await client.fetch<{_id: string; _type: string; pageBuilder?: unknown[]} | null>(
    `*[_type == "page" && slug.current == "agriculture" && !(_id in path("drafts.**"))][0]`,
  )
  if (!page) throw new Error('No published Agriculture page. Nothing was written.')
  const draftId = `drafts.${page._id}`
  if (await client.getDocument(draftId)) throw new Error(`${draftId} already exists; publish or discard it first.`)
  if (page.pageBuilder?.length) throw new Error('The Agriculture page already has blocks; not overwriting.')

  const [contact, news, agriculture] = await Promise.all([
    client.fetch<string | null>(`*[_type == "page" && slug.current == "connect-with-us"][0]._id`),
    client.fetch<string | null>(`*[_type == "page" && slug.current == "news" && parent->slug.current == "our-work"][0]._id`),
    client.fetch<string | null>(`*[_type == "projectType" && slug.current == "agriculture"][0]._id`),
  ])
  if (!contact || !news || !agriculture) throw new Error('Missing a referenced document (contact, news or agriculture type).')

  const grower = (name: string, tag: string) => ({_key: key(), _type: 'grower', name, tag})

  const pageBuilder = [
    {
      _key: key(),
      _type: 'heroSecondary',
      // No eyebrow: it falls back to the page name, "Agriculture".
      body: 'Through Land Bank–operated farms and partnerships with local growers, these spaces continue to grow food, support farmers, and strengthen the community’s connection to the land.',
      variant: 'lowlands',
    },
    {
      _key: key(),
      _type: 'basicLeftRightText',
      heading: 'Our Agricultural Efforts and Initiatives',
      headingLevel: 'h2',
      buttons: [{_key: key(), _type: 'blockButton', label: 'Contact us', variant: 'primary', link: pageLink(contact)}],
      rightContent: [
        block('h3', 'Farm to Table'),
        block(
          'normal',
          "The Land Bank has long recognized that protecting land and supporting local food production go hand in hand. We work with local farmers to provide acreage for sustainable agriculture, helping keep fresh, locally grown produce available to the Nantucket community. Our agricultural properties are home to some of the island's most beloved farms — including Fog Town Farm, Washashore Farm, and Eat Fire Farm — and we lease farmland to Moors End Farm and My Grandfather's Farm, both of which are woven into the fabric of island life.",
        ),
        block(
          'normal',
          "We also partner with Sustainable Nantucket's Mentor Farmers Program, which provides training, resources, and support for aspiring farmers, strengthening the next generation of agricultural stewards on the island. At Eat Fire Spring, we have licensed property to Aidan and Natasha Feeney of Fog Town Farm, extending our commitment to working farmers who share our values.",
        ),
        block(
          'normal',
          "Looking ahead, we are piloting a restoration project at Millbrook Heritage Orchard — with the hope of one day bringing apple picking back to Nantucket as a living piece of the island's agricultural heritage.",
        ),
        {
          _key: key(),
          _type: 'anchorLinks',
          links: [
            placeholderLink('Agricultural Policy'),
            placeholderLink('Sustainable Nantucket’s Mentor Farmers Program'),
            placeholderLink('Agricultural Partners'),
          ],
        },
        block(
          'normal',
          "Agriculture on Nantucket is more than food production — it is part of what makes the island feel like itself. The open fields, working farms, and pastoral landscapes that the Land Bank protects contribute to the visual character of Nantucket just as much as its moors and coastline. When farmland is lost to development, something irreplaceable goes with it — not just the soil and the harvest, but the sense of a place that still works the land. By keeping agricultural acres in active production and partnering with farmers who are genuinely rooted in this community, the Land Bank helps ensure that Nantucket's farming tradition remains a living part of island life, not just a memory of it.",
        ),
      ],
    },
    {
      _key: key(),
      _type: 'imageCarousel',
      eyebrow: 'Nantucket Farms and Agricultural Work',
      source: 'category',
      category: {_type: 'reference', _ref: agriculture},
    },
    {
      _key: key(),
      _type: 'growers',
      heading: 'Our Nantucket Growers',
      body: 'Nantucket growers keep the island’s agricultural traditions thriving, cultivating local food while caring for the land that makes it possible.',
      growers: [
        grower('Berry Patch Farm', 'Independently owned & Operated'),
        grower('Fog Town Farm', 'On Land Bank Land'),
        grower('Eat Fire Farm', 'On Land Bank Land'),
        grower('My Grandfather’s Farm', 'On Land Bank Land'),
        grower('Sustainable Nantucket', 'Independently owned & Operated'),
        grower('Moors End Farm', 'Independently owned & Operated'),
      ],
    },
    {
      _key: key(),
      _type: 'newsPreview',
      heading: 'Nantucket News',
      count: 2,
      ctaHeading: 'Check out what is happening with the latest NLB news.',
      ctaLabel: 'View all news',
      ctaLink: pageLink(news),
    },
  ]

  console.log(`Agriculture page ${page._id}: ${pageBuilder.length} blocks${DRY_RUN ? ' (dry run)' : ''}`)
  for (const b of pageBuilder) console.log(`  ${b._type}`)
  if (DRY_RUN) return

  await client.createOrReplace({...page, _id: draftId, pageBuilder})
  console.log(`Wrote ${draftId}. Review and publish it in Studio.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
