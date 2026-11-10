/**
 * Copies the slider images of one property from the live site,
 * "The Coast to Coast Trail" (https://www.nantucketlandbank.org/property/the-coast-to-coast-trail/),
 * onto the EXISTING `property` document with that slug, as its `gallery`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedCoastToCoastGallery.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedCoastToCoastGallery.ts --with-user-token
 *
 * What it writes: `gallery` only (the slider's images, full size, in slider order, with the site's alt
 * text), uploaded as assets. It reads the slider from the live page when it runs, patches every copy
 * of the property (draft and/or published), and sets the field ONLY if it is currently empty.
 * --dry prints the images found and writes nothing (it does not download them).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SLUG = 'the-coast-to-coast-trail'
const PAGE = `https://www.nantucketlandbank.org/property/${SLUG}/`

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
const decode = (s: string) =>
  s.replace(/&#8217;|&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()

async function main() {
  const res = await fetch(PAGE)
  if (!res.ok) throw new Error(`Could not read ${PAGE}: HTTP ${res.status}`)
  const html = await res.text()

  // Slides are the lazy-loaded <img> tags (real URL in data-soliloquy-src), or the first one, whose src is real.
  const slides: Array<{url: string; alt: string}> = []
  for (const tag of html.match(/<img\b[^>]*soliloquy-image-\d+[^>]*>/g) ?? []) {
    if (!/soliloquy-image-\d+"/.test(tag) && !/id="soliloquy-image-\d+"/.test(tag)) continue
    const raw = attr(tag, 'data-soliloquy-src') ?? attr(tag, 'src')
    if (!raw || raw.includes('holder.gif')) continue
    // The slider serves a cropped rendition (-990x550_c); the original has no size suffix.
    const url = raw.replace(/-\d+x\d+_c(\.\w+)$/, '$1')
    if (slides.some((s) => s.url === url)) continue
    slides.push({url, alt: decode(attr(tag, 'alt') ?? '')})
  }
  slides.forEach((s, i) => console.log(`  ${i + 1}. ${s.url}  alt="${s.alt}"`))
  if (slides.length === 0) throw new Error('No slider images found on the page.')

  const docs = await client.fetch<Array<{_id: string; gallery?: unknown[]}>>(
    `*[_type == "property" && slug.current == $slug]{_id, gallery}`,
    {slug: SLUG},
  )
  if (docs.length === 0) throw new Error(`No property with slug ${SLUG}.`)
  docs.forEach((d) =>
    console.log(`${d._id}: gallery ${d.gallery?.length ? 'has content - left alone' : `will get ${slides.length} images`}`),
  )
  if (DRY_RUN) {
    console.log('[dry run] nothing written.')
    return
  }
  if (docs.every((d) => d.gallery?.length)) return

  const gallery = []
  for (const [i, slide] of slides.entries()) {
    const r = await fetch(slide.url)
    if (!r.ok) throw new Error(`Could not download ${slide.url}: HTTP ${r.status}`)
    const asset = await client.assets.upload('image', Buffer.from(await r.arrayBuffer()), {
      filename: slide.url.split('/').pop(),
    })
    gallery.push({
      _type: 'image',
      _key: `c2c-slide-${i + 1}`,
      asset: {_type: 'reference', _ref: asset._id},
      ...(slide.alt ? {alt: slide.alt} : {}),
    })
  }
  for (const doc of docs) {
    if (doc.gallery?.length) continue
    await client.patch(doc._id).set({gallery}).commit()
    console.log(`  patched ${doc._id}: gallery (${gallery.length} images)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
