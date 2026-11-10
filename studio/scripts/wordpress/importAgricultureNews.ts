/**
 * Migrates the WordPress posts in https://www.nantucketlandbank.org/category/news/agriculture/ to
 * DRAFT `article`s at /news/<slug>.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importAgricultureNews.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importAgricultureNews.ts --with-user-token
 *
 * What it writes: one draft `article` per post (Sanity generates the id) and the image assets,
 * downloaded from the live site. Nothing else is touched. It reads the live site, so it needs
 * network access; it also reads `node-html-parser`, which comes with the Sanity CLI and is not a
 * declared dependency of this package.
 *
 * Idempotent and non-destructive: an article with a post's slug, published or draft, is skipped and
 * NEVER edited. --dry prints the plan (the outline of each body, and whether every image URL
 * resolves) but writes and uploads nothing. The news categories must already exist; the script stops
 * without writing if one does not.
 *
 * Which posts: the category lists seven. Three already exist in Studio and are therefore skipped by
 * the check above, and are not in SLUGS: farmer-in-focus-eat-fire-farm, farmer-in-focus-fog-town-farm
 * and preserving-expanding-local-agriculture (the last is titled "... - Needs Review" in Studio).
 *
 * Decisions:
 *  - title, date: the post's title and original publish date. WordPress shows no modified date that
 *    is used.
 *  - image (required on an article): the post's featured image (its og:image) is the article image.
 *    If the same photo is also in the body (the Community Garden post uploaded it twice, as
 *    `...-n3951f` and `...-n3951f-1`) it is dropped from the body, so it is not shown twice. The
 *    article image has no caption field, so the standalone "Photo by Bill Hoenk" credit line that
 *    opens two posts (it credits that image) is not carried over.
 *  - image files: the full-size original is tried first (the WordPress size suffix removed, then the
 *    `-scaled` file) and the embedded copy is the fallback.
 *  - alt text: Sanity requires it, and three body images and all four featured images have none in
 *    WordPress. They are described in ALT below, from looking at the photos.
 *  - galleries: each WordPress gallery, and each run of adjacent single images, becomes one image
 *    gallery. The italic or "Photos by ..." line under a gallery becomes the gallery caption. A
 *    caption that WordPress put on only the last image of a run, in the plural ("Photos by ..."),
 *    credits the whole run, so it becomes the gallery caption too.
 *  - headings: H2 in WordPress becomes Heading 3 (the editor offers nothing higher), as in the other
 *    migrations.
 *  - the Community Garden testimonial is a pull quote; its quotation marks are dropped (the
 *    component adds them).
 *  - the table in the pollinators post is a 2x2 grid of four threats, each a bold title over a
 *    paragraph. A Sanity table cell is plain text, which would lose the three links in it and the bold,
 *    so each threat becomes a Heading 4 and a paragraph, in reading order.
 *  - the six conservation tips in the pollinators post are one numbered list, though WordPress
 *    stored each as its own list that restarts the count.
 *  - categories: the post's `newsCategory` categories. `News` is the section, not a category.
 *  - links are kept as written. The Hinsdale Park post links to the old site's
 *    /about/projects/community-garden/, which is the same domain as the live site; whether that path
 *    exists in the new site is not checked here.
 *  - the body text is otherwise verbatim, including the source's typography. No SEO overrides were
 *    read.
 */

import {getCliClient} from 'sanity/cli'
import {parse, HTMLElement, NodeType, type Node} from 'node-html-parser'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const SITE = 'https://www.nantucketlandbank.org'

const SLUGS = [
  'celebrating-the-opening-of-the-land-bank-community-garden',
  'pollinators-the-powerhouse-of-our-food-system',
  'property-spotlight-hinsdale-park',
  'farmer-in-focus-nick-larrabee-of-my-grandfathers-farm',
]

/** Alt text for images WordPress left without it, keyed by file name without size or extension. */
const ALT: Record<string, string> = {
  // featured images
  'down-net_http20240816-127-n3951f-1': 'Raised garden beds at the Land Bank Community Garden',
  Bee: 'A bumblebee on a thistle',
  '3F0A3868': 'A child riding a zip line at the Discovery Playground',
  '3F0A5412-copy':'A farmer carrying a bucket of squash past the greenhouse at My Grandfather’s Farm',
  // body images
  '3F0A5658-copy': 'A sunflower in bloom',
  '3F0A4551-copy-1': 'A goldfinch standing at a puddle, reflected in the water',
  'down-net_http20240820-77-xfmc3d': 'A butterfly on a purple wildflower',
}

type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
type MarkDef = {_type: 'link'; _key: string; linkType: 'href'; href: string; openInNewTab?: boolean}
type Inline = {
  children: Array<{text: string; marks: string[]; link?: number}>
  links: Array<{key: string; href: string; openInNewTab: boolean}>
}

type Img = {candidates: string[]; alt: string; caption?: string; base: string; gallery: boolean}
type Token =
  | {t: 'p'; inline: Inline; text: string; allEm: boolean; cls: string}
  | {t: 'h'; inline: Inline; style: 'h3' | 'h4'}
  | {t: 'li'; inline: Inline; kind: 'number' | 'bullet'}
  | {t: 'img'; img: Img}
  | {t: 'quote'; quote: string; attribution?: string}
  | {t: 'hr'}

// ---------- text ----------

const clean = (s: string) => s.replace(/[ \s]+/g, ' ')

function inlineOf(el: HTMLElement): Inline {
  const raw: Array<{text: string; marks: string[]; link?: number}> = []
  const links: Inline['links'] = []
  const walk = (node: Node, marks: string[], link?: number) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      raw.push({text: clean(node.text), marks, link})
      return
    }
    if (!(node instanceof HTMLElement)) return
    const tag = node.rawTagName.toLowerCase()
    if (tag === 'svg' || tag === 'script' || tag === 'style') return
    if (tag === 'br') {
      raw.push({text: ' ', marks, link})
      return
    }
    let m = marks
    let l = link
    if (tag === 'strong' || tag === 'b') m = [...marks, 'strong']
    else if (tag === 'em' || tag === 'i') m = [...marks, 'em']
    else if (tag === 'a') {
      const href = node.getAttribute('href')
      if (!href) throw new Error(`Link without href: ${node.outerHTML.slice(0, 120)}`)
      links.push({key: `l${links.length + 1}`, href: href.trim(), openInNewTab: node.getAttribute('target') === '_blank'})
      l = links.length - 1
    } else if (!['span', 'sup', 'sub', 'u'].includes(tag)) {
      throw new Error(`Unhandled inline <${tag}>: ${node.outerHTML.slice(0, 120)}`)
    }
    node.childNodes.forEach((c) => walk(c, m, l))
  }
  el.childNodes.forEach((c) => walk(c, []))

  // Merge neighbours that share marks and link, collapse the spaces at the joins, trim the ends.
  const merged: Array<{text: string; marks: string[]; link?: number}> = []
  for (const piece of raw) {
    const last = merged[merged.length - 1]
    if (last && last.link === piece.link && last.marks.join() === piece.marks.join()) last.text += piece.text
    else merged.push({...piece})
  }
  let prevEndsSpace = true
  for (const piece of merged) {
    if (prevEndsSpace) piece.text = piece.text.replace(/^ /, '')
    piece.text = piece.text.replace(/ {2,}/g, ' ')
    prevEndsSpace = piece.text.endsWith(' ')
  }
  while (merged.length && !merged[merged.length - 1].text.trim()) merged.pop()
  if (merged.length) merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/ $/, '')
  const kept = merged.filter((p) => p.text !== '')
  return {children: kept, links}
}

// ---------- content tree -> tokens ----------

const baseName = (url: string) =>
  decodeURIComponent(url.split('/').pop() ?? url)
    .replace(/\.[a-z]+$/i, '')
    .replace(/-\d+x\d+$/, '')
    .replace(/-scaled$/, '')

/** The full-size original first, then the `-scaled` file, then the copy the post embeds. */
function candidatesFor(embedded: string): string[] {
  const url = embedded.trim().split(/\s+/)[0].replace(/,$/, '')
  const original = url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1').replace(/-scaled(\.[a-z]+)$/i, '$1')
  const scaled = original.replace(/(\.[a-z]+)$/i, '-scaled$1')
  return [...new Set([original, scaled, url])]
}

function imgOf(img: HTMLElement, srcFrom: string, caption: string | undefined, gallery: boolean): Img {
  const src = srcFrom || img.getAttribute('src') || ''
  if (!src) throw new Error(`Image without a source: ${img.outerHTML.slice(0, 120)}`)
  const base = baseName(src)
  const alt = (img.getAttribute('alt') ?? '').trim() || ALT[base]
  if (!alt) throw new Error(`No alt text for ${src}; add it to ALT under "${base}"`)
  return {candidates: candidatesFor(src), alt, caption, base, gallery}
}

function tokenize(root: HTMLElement): Token[] {
  const tokens: Token[] = []
  const visit = (node: Node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      if (node.text.trim()) throw new Error(`Loose text in the content: "${node.text.trim().slice(0, 80)}"`)
      return
    }
    if (!(node instanceof HTMLElement)) return
    const tag = node.rawTagName.toLowerCase()
    const cls = node.getAttribute('class') ?? ''
    if (tag === 'script' || tag === 'style') return
    if (tag === 'p') {
      const inline = inlineOf(node)
      const text = inline.children.map((c) => c.text).join('')
      if (!text.trim()) return
      tokens.push({t: 'p', inline, text, allEm: inline.children.every((c) => c.marks.includes('em')), cls})
    } else if (/^h[2-6]$/.test(tag)) {
      const inline = inlineOf(node)
      if (inline.children.length) tokens.push({t: 'h', inline, style: 'h3'})
    } else if (tag === 'ol' || tag === 'ul') {
      for (const li of node.childNodes.filter((c): c is HTMLElement => c instanceof HTMLElement)) {
        tokens.push({t: 'li', inline: inlineOf(li), kind: tag === 'ol' ? 'number' : 'bullet'})
      }
    } else if (tag === 'hr') {
      tokens.push({t: 'hr'})
    } else if (tag === 'blockquote') {
      const cite = node.querySelector('cite')
      const attribution = cite ? clean(cite.text).trim() : undefined
      cite?.parentNode?.removeChild(cite)
      node.querySelectorAll('svg, footer').forEach((n) => n.parentNode?.removeChild(n))
      const quote = clean(node.text).trim().replace(/^[“"]\s*/, '').replace(/\s*[”"]$/, '')
      tokens.push({t: 'quote', quote, attribution})
    } else if (tag === 'figure' && node.querySelector('table')) {
      // A 2x2 grid of threats: bold title over a paragraph (see the header).
      // Rows alternate: a row of titles, then the row of paragraphs under them. Emit each column's
      // title then its paragraph.
      const rows = node.querySelectorAll('tr').map((tr) => tr.querySelectorAll('td').map(inlineOf))
      const isTitleRow = (row: Inline[]) => row.every((c) => c.children.length > 0 && c.children.every((s) => s.marks.includes('strong')))
      for (let r = 0; r < rows.length; r += 2) {
        const [titles, texts] = [rows[r], rows[r + 1]]
        if (!texts || !isTitleRow(titles) || titles.length !== texts.length) throw new Error('Unexpected table shape')
        titles.forEach((title, c) => {
          tokens.push({t: 'h', inline: {...title, children: title.children.map((s) => ({...s, marks: []}))}, style: 'h4'})
          tokens.push({t: 'p', inline: texts[c], text: texts[c].children.map((s) => s.text).join(''), allEm: false, cls: ''})
        })
      }
    } else if (tag === 'figure') {
      const img = node.querySelector('img')
      if (!img) throw new Error(`Figure without an image: ${node.outerHTML.slice(0, 120)}`)
      const cap = node.querySelector('figcaption')
      const caption = cap ? clean(cap.text).trim() : undefined
      tokens.push({t: 'img', img: imgOf(img, img.getAttribute('src') ?? '', caption || undefined, false)})
    } else if (cls.includes('wp-block-uagb-image-gallery')) {
      for (const wrapper of node.querySelectorAll('.spectra-image-gallery__media-wrapper')) {
        const img = wrapper.querySelector('img')
        if (!img) throw new Error('Gallery item without an image')
        const source = wrapper.querySelector('source')?.getAttribute('srcset') ?? ''
        tokens.push({t: 'img', img: imgOf(img, source, undefined, true)})
      }
    } else if (tag === 'div') {
      node.childNodes.forEach(visit)
    } else {
      throw new Error(`Unhandled <${tag}>: ${node.outerHTML.slice(0, 120)}`)
    }
  }
  root.childNodes.forEach(visit)
  return tokens
}

// ---------- tokens -> Portable Text ----------

type Plan = {
  slug: string
  title: string
  date: string
  hero: {candidates: string[]; alt: string; base: string}
  categorySlugs: string[]
  body: object[] // image `asset._ref` holds a candidate URL until `withAssets` swaps it
}

function buildPlan(slug: string, html: string): Plan {
  const doc = parse(html)
  const title = doc.querySelector('h1.entry-title')?.text.trim()
  const datetime = doc.querySelector('article time.entry-date.published')?.getAttribute('datetime')
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
  const content = doc.querySelector('.entry-content')
  if (!title || !datetime || !ogImage || !content) throw new Error(`${slug}: missing title, date, image or content`)

  const categorySlugs = doc
    .querySelectorAll('.cat-links a[rel~="tag"]')
    .map((a) => (a.getAttribute('href') ?? '').replace(/\/$/, '').split('/').pop() ?? '')
    .filter((s) => s && s !== 'news')

  const heroBase = baseName(ogImage)
  const heroAlt = ALT[heroBase]
  if (!heroAlt) throw new Error(`${slug}: no alt text for the featured image; add "${heroBase}" to ALT`)

  const tokens = tokenize(content)
  // The credit line that opens a post belongs to the featured image (see the header).
  if (tokens[0]?.t === 'p' && /^Photos? by /i.test(tokens[0].text) && tokens[0].cls.includes('has-text-align-right')) tokens.shift()

  const body: object[] = []
  let n = 0
  const key = (prefix: string) => `${prefix}${++n}`
  const textBlock = (inline: Inline, style: string, extra: object = {}) => {
    const k = key('b')
    return {_type: 'block', _key: k, style, ...extra, ...spansWithLinks(inline, k)}
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.t === 'img') {
      let run: Img[] = []
      while (tokens[i]?.t === 'img') run.push((tokens[i++] as Extract<Token, {t: 'img'}>).img)
      i--
      // WordPress sometimes stores a featured image as a second upload of the body photo, named with a "-1".
      run = run.filter((img) => img.base !== heroBase && img.base !== heroBase.replace(/-1$/, ''))
      if (!run.length) continue
      let runCaption: string | undefined
      const next = tokens[i + 1]
      if (run.some((r) => r.gallery) && next?.t === 'p' && next.text.length < 90 && (next.allEm || /^Photos? by /i.test(next.text))) {
        runCaption = next.text.trim()
        i++
      }
      const captioned = run.filter((r) => r.caption)
      if (!runCaption && run.length > 1 && captioned.length === 1 && run[run.length - 1].caption && /^Photos /i.test(run[run.length - 1].caption!)) {
        runCaption = run[run.length - 1].caption
        run[run.length - 1] = {...run[run.length - 1], caption: undefined}
      }
      if (run.length === 1) {
        const r = run[0]
        body.push({_type: 'image', _key: key('i'), asset: {_type: 'reference', _ref: r.candidates.join('|')}, alt: r.alt, ...(r.caption || runCaption ? {caption: r.caption ?? runCaption} : {})})
        continue
      }
      for (let c = 0; c < run.length; c += 6) {
        const chunk = run.slice(c, c + 6)
        if (chunk.length < 2) {
          const r = chunk[0]
          body.push({_type: 'image', _key: key('i'), asset: {_type: 'reference', _ref: r.candidates.join('|')}, alt: r.alt, ...(r.caption ? {caption: r.caption} : {})})
          continue
        }
        const last = c + 6 >= run.length
        body.push({
          _type: 'imageGallery',
          _key: key('g'),
          images: chunk.map((r) => ({
            _type: 'galleryImage',
            _key: key('gi'),
            asset: {_type: 'reference', _ref: r.candidates.join('|')},
            alt: r.alt,
            ...(r.caption ? {caption: r.caption} : {}),
          })),
          ...(runCaption && last ? {caption: runCaption} : {}),
        })
      }
    } else if (tok.t === 'p') {
      body.push(textBlock(tok.inline, 'normal'))
    } else if (tok.t === 'h') {
      body.push(textBlock(tok.inline, tok.style))
    } else if (tok.t === 'li') {
      body.push(textBlock(tok.inline, 'normal', {listItem: tok.kind, level: 1}))
    } else if (tok.t === 'quote') {
      body.push({_type: 'pullquote', _key: key('q'), quote: tok.quote, ...(tok.attribution ? {attribution: tok.attribution} : {})})
    } else {
      body.push({_type: 'divider', _key: key('d'), style: 'full'})
    }
  }

  return {
    slug,
    title,
    date: datetime.slice(0, 10),
    hero: {candidates: candidatesFor(ogImage), alt: heroAlt, base: heroBase},
    categorySlugs,
    body,
  }
}

/** Spans plus the link annotations they reference. */
function spansWithLinks(inline: Inline, key: string) {
  const markDefs: MarkDef[] = []
  const children: Span[] = inline.children.map((c, i) => {
    const marks = [...c.marks]
    if (c.link !== undefined) {
      const l = inline.links[c.link]
      const mk = `${key}${l.key}`
      if (!markDefs.some((m) => m._key === mk)) {
        markDefs.push({_type: 'link', _key: mk, linkType: 'href', href: l.href, ...(l.openInNewTab ? {openInNewTab: true} : {})})
      }
      marks.push(mk)
    }
    return {_type: 'span', _key: `${key}s${i + 1}`, text: c.text, marks}
  })
  return {children, markDefs}
}

// ---------- run ----------

async function firstThatResolves(candidates: string[]): Promise<string> {
  for (const url of candidates) {
    const response = await fetch(url, {method: 'HEAD'})
    if (response.ok) return url
  }
  throw new Error(`None of these resolve: ${candidates.join(', ')}`)
}

const uploaded = new Map<string, string>()
async function uploadImage(candidates: string[]): Promise<string> {
  const url = await firstThatResolves(candidates)
  const cached = uploaded.get(url)
  if (cached) return cached
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
    filename: decodeURIComponent(url.split('/').pop() ?? 'image'),
  })
  uploaded.set(url, asset._id)
  return asset._id
}

type Walkable = {_type?: string; asset?: {_type?: string; _ref: string}; images?: Walkable[]}

/** Replaces each placeholder image reference (candidate URLs joined by "|") with an uploaded asset. */
async function withAssets(body: object[]): Promise<object[]> {
  const out: object[] = []
  for (const block of body as Walkable[]) {
    if (block._type === 'image' && block.asset) {
      out.push({...block, asset: {_type: 'reference', _ref: await uploadImage(block.asset._ref.split('|'))}})
    } else if (block._type === 'imageGallery' && block.images) {
      const images: Walkable[] = []
      for (const img of block.images) {
        images.push({...img, asset: {_type: 'reference', _ref: await uploadImage(img.asset!._ref.split('|'))}})
      }
      out.push({...block, images})
    } else out.push(block)
  }
  return out
}

function outline(body: object[]): string {
  return (body as Array<Record<string, unknown>>)
    .map((b) => {
      if (b._type === 'block') {
        const text = ((b.children as Span[]) ?? []).map((c) => c.text).join('')
        const tag = b.listItem ? `${b.listItem} item` : String(b.style)
        const links = ((b.markDefs as MarkDef[]) ?? []).length
        return `    ${tag}: ${text.length > 70 ? `${text.slice(0, 70)}…` : text}${links ? `  [${links} link${links > 1 ? 's' : ''}]` : ''}`
      }
      if (b._type === 'imageGallery') {
        const images = b.images as Array<{alt: string}>
        return `    gallery (${images.length}): ${images.map((i) => i.alt).join(' / ')}${b.caption ? `  caption: ${b.caption}` : ''}`
      }
      if (b._type === 'image') return `    image: ${b.alt}${b.caption ? `  caption: ${b.caption}` : ''}`
      if (b._type === 'pullquote') return `    pullquote: ${b.quote} (${b.attribution ?? 'no attribution'})`
      return `    ${b._type}`
    })
    .join('\n')
}

async function main() {
  const categoryIds = new Map<string, string>()
  const categories = await client.fetch<Array<{_id: string; slug: string}>>(
    `*[_type == "newsCategory" && !(_id in path("drafts.**"))]{_id, "slug": slug.current}`,
  )
  categories.forEach((c) => categoryIds.set(c.slug, c._id))

  const plans: Plan[] = []
  for (const slug of SLUGS) {
    const existing = await client.fetch<Array<{_id: string}>>(`*[_type == "article" && slug.current == $slug]{_id}`, {slug})
    if (existing.length > 0) {
      console.log(`= ${slug}: exists, left as is (${existing.map((e) => e._id).join(', ')})`)
      continue
    }
    const response = await fetch(`${SITE}/${slug}/`)
    if (!response.ok) throw new Error(`Could not fetch ${slug}: ${response.status}`)
    const plan = buildPlan(slug, await response.text())
    const missing = plan.categorySlugs.filter((s) => !categoryIds.has(s))
    if (missing.length) throw new Error(`${slug}: news categories not found in Studio: ${missing.join(', ')}`)
    plans.push(plan)
  }

  for (const plan of plans) {
    const imageCount = (plan.body as Walkable[]).reduce(
      (sum, b) => sum + (b._type === 'image' ? 1 : b._type === 'imageGallery' ? b.images!.length : 0),
      0,
    )
    console.log(
      `\nPlan: draft article "${plan.title}" (/news/${plan.slug}), ${plan.date}, ${plan.body.length} body blocks, ` +
        `${imageCount} body images, categories: ${plan.categorySlugs.join(', ') || 'none'}`,
    )
    console.log(`  article image: ${plan.hero.candidates[plan.hero.candidates.length - 1]}`)
    console.log(process.argv.includes('--json') ? JSON.stringify(plan.body, null, 1) : outline(plan.body))
    if (DRY_RUN) {
      // Check that every image resolves, without downloading any.
      const all = [plan.hero.candidates, ...(plan.body as Walkable[]).flatMap((b) => (b._type === 'image' ? [b.asset!._ref.split('|')] : b._type === 'imageGallery' ? b.images!.map((i) => i.asset!._ref.split('|')) : []))]
      for (const candidates of all) await firstThatResolves(candidates)
      console.log(`  all ${all.length} image URLs resolve`)
    }
  }
  if (DRY_RUN) {
    console.log('\n[dry run] nothing downloaded or written.')
    return
  }

  for (const plan of plans) {
    const heroId = await uploadImage(plan.hero.candidates)
    const body = await withAssets(plan.body)
    const created = await client.create({
      _id: 'drafts.',
      _type: 'article',
      title: plan.title,
      slug: {_type: 'slug', current: plan.slug},
      date: plan.date,
      image: {_type: 'image', asset: {_type: 'reference', _ref: heroId}, alt: plan.hero.alt},
      body,
      categories: plan.categorySlugs.map((s) => ({_type: 'reference', _key: s, _ref: categoryIds.get(s)!})),
    } as never)
    console.log(`+ created ${created._id} "${plan.title}"`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
