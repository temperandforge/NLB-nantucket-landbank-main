/**
 * Migrates one news post from the live site, "Land Bank Acquires 100 Acres in Madaket"
 * (https://www.nantucketlandbank.org/land-bank-acquires-100-acres-in-madaket/, read 2026-11-05),
 * as a DRAFT `article`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedMadaketArticle.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedMadaketArticle.ts --with-user-token
 *
 * What it writes: one draft `article` (title, slug, date, body, category) and, to satisfy the
 * required image field, the post's own featured image, downloaded from the old site's media
 * library and uploaded as an asset. Nothing is published, nothing existing is edited or deleted.
 *
 * Idempotent: if an article with this slug exists (published or draft) it does nothing. Re-running
 * never creates a second copy or a second asset.
 *
 * The old URL (/land-bank-acquires-100-acres-in-madaket/) becomes /news/<slug>; it needs a redirect
 * once the old site is retired (#76). The post also carried a "News" tag, which has no category
 * here, so only Conservation is applied.
 *
 * --dry prints the plan and writes nothing (it does not download the image).
 */

import {getCliClient} from 'sanity/cli'

import {htmlToBlocks} from './wordpress/faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'land-bank-acquires-100-acres-in-madaket'
const TITLE = 'Land Bank Acquires 100 Acres in Madaket'
const DATE = '2015-10-15'
const CATEGORY_SLUGS = ['conservation']
const IMAGE_URL = 'https://www.nantucketlandbank.org/wp-content/uploads/properteis-marker.jpg'
const IMAGE_ALT = 'Nantucket Land Bank Properties Marker'

const BODY_HTML = `
<p>On October 13, 2015 the Land Bank purchased 100 acres of land at the Head of Plains in Madaket from the United States General Services Administration (GSA). The property is located just east of the Massasoit Bridge between Massasoit Bridge Road and Red Barn Road and is one of the largest remaining undeveloped properties on Nantucket. The acquisition preserves a large swath of critical habitat for regionally and globally rare plant communities. It also achieves the goal of securing permanent public access to the property.</p>
<p>The property is fairly unique in that it contains a wide variety of plant communities, including sandplain grassland, huckleberry and scrub oak heathland and scrub oak barrens. The Head of Plains land provides integral environmental corridors, connecting over 2,000 acres of previously protected property.</p>
<p>The Land Bank worked collaboratively with several island organizations to fund the acquisition. A Community Preservation Committee grant of $650,000 was obtained by the Nantucket Land Council (NLC) on behalf of the Town.</p>
<p>In addition, the Land Council contributed $350,000. The Madaket Conservation Associate (MCA) contributed $200,000. The Madaket Residents Association (MRA) and Sheep Pond area residents contributed $230,000. In total $1,430,000 was received and the Land Bank provided the $5,570,000 balance of the $7 million purchase price.</p>
`

async function main() {
  const existing = await client.fetch<Array<{_id: string}>>(
    `*[_type == "article" && slug.current == $slug]{_id}`,
    {slug: SLUG},
  )
  if (existing.length > 0) {
    console.log(`= already exists (${existing.map((d) => d._id).join(', ')}); nothing to do.`)
    return
  }

  const {blocks, issues} = htmlToBlocks(BODY_HTML, 'madaket')
  issues.forEach((issue) => console.log(`  ! ${issue}`))
  if (blocks.length === 0) throw new Error('No body converted.')

  const categories = await client.fetch<Array<{_id: string; slug: string}>>(
    `*[_type == "newsCategory" && slug.current in $slugs]{_id, "slug": slug.current}`,
    {slugs: CATEGORY_SLUGS},
  )
  const missing = CATEGORY_SLUGS.filter((slug) => !categories.some((c) => c.slug === slug))
  if (missing.length) throw new Error(`Missing news categories: ${missing.join(', ')}`)

  if (DRY_RUN) {
    console.log(`[dry run] would create draft article "${TITLE}" (${SLUG}, ${DATE}, ${CATEGORY_SLUGS.join(', ')}, ${blocks.length} body blocks)`)
    console.log(`[dry run] would download and upload ${IMAGE_URL}`)
    return
  }

  const response = await fetch(IMAGE_URL)
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: IMAGE_URL.split('/').pop(),
  })
  console.log(`  + image uploaded (${asset._id})`)

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: IMAGE_ALT},
    body: blocks,
    categories: categories.map((category) => ({
      _type: 'reference',
      _key: category._id.slice(0, 12),
      _ref: category._id,
    })),
  } as never)
  console.log(`+ draft article created (${created._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
