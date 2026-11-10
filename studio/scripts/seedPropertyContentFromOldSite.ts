/**
 * Migrates the page content (About) and slider images (Gallery) of every property on the live site's
 * property sitemap (https://www.nantucketlandbank.org/property-sitemap.xml) onto the EXISTING
 * `property` document with the same slug. Each page is read when the script runs.
 *
 * Run from the studio directory, dry first, and read the plan before the real run:
 *   npx sanity exec scripts/seedPropertyContentFromOldSite.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPropertyContentFromOldSite.ts --with-user-token
 *
 * What it writes: `about` (the page's body text, headings as the site has them: its H2 stay Heading 2)
 * and `gallery` (the slider's images, full size, in slider order, with the site's alt text; uploaded as
 * assets). It patches every copy of the property (draft and/or published) and sets a field ONLY if it is
 * currently empty, so edited or earlier-migrated content is never overwritten. Nothing else changes.
 *
 * Not migrated: the "Property Marker" sign-post block (same boilerplate on every page), body images
 * and tables (reported as issues), and the sidebar sections. A slider of fewer than two images is
 * not migrated (the cover image already covers it).
 *
 * --dry prints the plan and writes nothing (it reads the pages but downloads no images).
 */

import {getCliClient} from 'sanity/cli'

import {htmlToBlocks} from './wordpress/faqs'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')
const ORIGIN = 'https://www.nantucketlandbank.org'

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
const decode = (s: string) =>
  s
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const plain = (html: string) => decode(html.replace(/<[^>]+>/g, ''))

type Slide = {url: string; alt: string}

function readSlides(html: string): Slide[] {
  const slides: Slide[] = []
  for (const tag of html.match(/<img\b[^>]*id="soliloquy-image-\d+"[^>]*>/g) ?? []) {
    const raw = attr(tag, 'data-soliloquy-src') ?? attr(tag, 'src')
    if (!raw || raw.includes('holder.gif')) continue
    // The slider serves a cropped rendition (-990x550_c); the original has no size suffix.
    const url = raw.replace(/-\d+x\d+_c(\.\w+)$/, '$1')
    if (!slides.some((s) => s.url === url)) slides.push({url, alt: decode(attr(tag, 'alt') ?? '')})
  }
  return slides
}

function readBody(html: string) {
  let body = html.match(/<div class="entry-content">([\s\S]*?)<\/div><!-- \.entry-content -->/)?.[1] ?? ''
  const marker = body.search(/<h3[^>]*>\s*Property Marker/i)
  if (marker >= 0) body = body.slice(0, marker)
  body = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
  const h2s = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => plain(m[1]))
  const {blocks, issues} = htmlToBlocks(body, 'about')
  // The converter turns every H2 into an H3; the About field allows Heading 2, which the site used.
  const about = blocks.map((b) =>
    b.style === 'h3' && h2s.includes(decode(b.children.map((c) => c.text).join(''))) ? {...b, style: 'h2'} : b,
  )
  return {about, issues}
}

async function main() {
  const docs = await client.fetch<Array<{_id: string; slug: string; about?: unknown[]; gallery?: unknown[]}>>(
    `*[_type == "property" && defined(slug.current)]{_id, "slug": slug.current, about, gallery} | order(slug asc)`,
  )
  const slugs = [...new Set(docs.map((d) => d.slug))]
  let wrote = 0

  for (const slug of slugs) {
    const copies = docs.filter((d) => d.slug === slug)
    const needAbout = copies.some((d) => !d.about?.length)
    const needGallery = copies.some((d) => !d.gallery?.length)
    if (!needAbout && !needGallery) {
      console.log(`= ${slug}: already has About and Gallery`)
      continue
    }

    const res = await fetch(`${ORIGIN}/property/${slug}/`)
    if (!res.ok) {
      console.log(`! ${slug}: old page unreadable (HTTP ${res.status}) - skipped`)
      continue
    }
    const html = await res.text()
    const {about, issues} = readBody(html)
    const slides = readSlides(html)
    const doAbout = needAbout && about.length > 0
    const doGallery = needGallery && slides.length >= 2
    console.log(
      `${doAbout || doGallery ? '+' : '-'} ${slug}: about ${doAbout ? `${about.length} blocks` : needAbout ? 'none found' : 'kept'}, ` +
        `gallery ${doGallery ? `${slides.length} images` : needGallery ? `skipped (${slides.length} found)` : 'kept'}`,
    )
    issues.forEach((i) => console.log(`    ! ${i}`))
    if (DRY_RUN || !(doAbout || doGallery)) continue

    let gallery: unknown[] = []
    if (doGallery) {
      for (const [i, slide] of slides.entries()) {
        const r = await fetch(slide.url)
        if (!r.ok) throw new Error(`Could not download ${slide.url}: HTTP ${r.status}`)
        const asset = await client.assets.upload('image', Buffer.from(await r.arrayBuffer()), {
          filename: slide.url.split('/').pop(),
        })
        gallery.push({
          _type: 'image',
          _key: `slide-${i + 1}`,
          asset: {_type: 'reference', _ref: asset._id},
          ...(slide.alt ? {alt: slide.alt} : {}),
        })
      }
    }
    for (const doc of copies) {
      const set: Record<string, unknown> = {}
      if (doAbout && !doc.about?.length) set.about = about
      if (doGallery && !doc.gallery?.length) set.gallery = gallery
      if (Object.keys(set).length === 0) continue
      await client.patch(doc._id).set(set).commit()
      wrote++
    }
  }
  console.log(DRY_RUN ? '[dry run] nothing written.' : `Patched ${wrote} document(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
