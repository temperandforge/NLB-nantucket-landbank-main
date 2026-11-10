/**
 * Migrates one WordPress post, https://www.nantucketlandbank.org/the-ottisons-a-true-nantucket-story/
 * to a DRAFT `article` at /news/the-ottisons-a-true-nantucket-story.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importTheOttisons.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importTheOttisons.ts --with-user-token
 *
 * What it writes: one draft `article` (Sanity generates the id) and one image asset downloaded from
 * the live site. Nothing else is touched.
 *
 * Idempotent and non-destructive: an article with this slug, published or draft, is skipped and NEVER
 * edited. --dry prints the plan (and checks the image URL resolves) but writes and uploads nothing.
 *
 * Decisions:
 *  - title: WordPress shows it in capitals ("THE OTTISONS: A TRUE NANTUCKET STORY"); the body and the
 *    image alt use "The Ottisons: A True Nantucket Story", so that casing is used.
 *  - date: the post's publish date, 2023-08-23. WordPress shows no modified date.
 *  - image (required on an article): the post's only image is the article image, so it is NOT
 *    repeated in the body. The full-size file the post links to is used; the 1024x514 copy it embeds
 *    is the fallback.
 *  - categories: the post is filed under News only, which is the section, not a `newsCategory`.
 *  - the body says viewers "can now watch" the film but the source gives no link or embed for where.
 *    None is invented; that is a gap in the source.
 *  - the stray blank line between the two paragraphs is dropped. No SEO overrides were read.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'the-ottisons-a-true-nantucket-story'
const TITLE = 'The Ottisons: A True Nantucket Story'
const DATE = '2023-08-23'
const IMAGE_ALT = 'The Ottisons: A True Nantucket Story'
const IMAGE_FILENAME = 'news-post-cover.png'
const IMAGE_CANDIDATES = [
  'https://www.nantucketlandbank.org/wp-content/uploads/news-post-cover.png',
  'https://www.nantucketlandbank.org/wp-content/uploads/news-post-cover-1024x514.png',
]

const PARAGRAPHS = [
  'We are pleased to share that you can now watch “The Ottisons: A True Nantucket Story” from the comfort of your home!',
  'In this film, Karl, Susan, and Albert Ottison paint a picture of their family history through the lens of their unique property on the Creeks. This documentary premiered at the Nantucket Film Festival, where it won the Documentary Short Film Audience Award.',
]

function buildBody() {
  return PARAGRAPHS.map((text, i) => ({
    _type: 'block',
    _key: `p${i + 1}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `p${i + 1}-s`, text, marks: []}],
  }))
}

async function resolveUrl(): Promise<string> {
  for (const url of IMAGE_CANDIDATES) {
    const response = await fetch(url, {method: 'HEAD'})
    if (response.ok) return url
  }
  throw new Error(`None of these resolve: ${IMAGE_CANDIDATES.join(', ')}`)
}

async function main() {
  const existing = await client.fetch<Array<{_id: string}>>(`*[_type == "article" && slug.current == $slug]{_id}`, {
    slug: SLUG,
  })
  if (existing.length > 0) {
    console.log(`= exists, left as is: ${existing.map((e) => e._id).join(', ')}`)
    return
  }

  const imageUrl = await resolveUrl()
  const body = buildBody()
  console.log(`Plan: draft article "${TITLE}" (/news/${SLUG}), ${DATE}, ${body.length} body blocks, image ${imageUrl}`)
  if (DRY_RUN) {
    console.log('[dry run] nothing downloaded or written.')
    return
  }

  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Could not download ${imageUrl}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: IMAGE_FILENAME,
  })

  const created = await client.create({
    _id: 'drafts.',
    _type: 'article',
    title: TITLE,
    slug: {_type: 'slug', current: SLUG},
    date: DATE,
    image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: IMAGE_ALT},
    body,
  } as never)
  console.log(`+ created ${created._id} (image ${asset._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
