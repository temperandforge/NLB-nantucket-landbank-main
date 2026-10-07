/**
 * Pure transform from the WordPress extraction (extractFaqs.php) to what the import writes: the
 * FAQ categories, the FAQs, and each answer converted from WordPress HTML to Portable Text.
 * No imports, so the check script can load it directly (verifyFaqsTransform.mts) — which is also
 * why the entity decoder below repeats the one in people.ts: Node needs the `.ts` extension on an
 * import and `tsc` here rejects it.
 */

export type SnapshotFaq = {
  wpId: number
  status: string
  question: string
  menuOrder: number
  /** `post_content`: Gutenberg block comments around HTML, or classic-editor text. */
  content: string
  categories: Array<{slug: string; name: string}>
}

export type SnapshotFaqCategory = {termId: number; slug: string; name: string; termOrder: number}

export type FaqSnapshot = {faqs: SnapshotFaq[]; categories: SnapshotFaqCategory[]}

export type PlannedFaqCategory = {slug: string; title: string; order: number}

export type PlannedFaq = {
  wpId: number
  question: string
  answer: PortableTextBlock[]
  categorySlug?: string
  order: number
}

export type PortableTextBlock = {
  _type: 'block'
  _key: string
  style: string
  markDefs: Array<{_type: 'link'; _key: string; linkType: 'href'; href: string; openInNewTab: boolean}>
  children: Array<{_type: 'span'; _key: string; text: string; marks: string[]}>
  listItem?: 'bullet' | 'number'
  level?: number
}

const NAMED: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED[entity.toLowerCase()] ?? match
  })
}

function clean(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim()
}

// --- HTML -> Portable Text -----------------------------------------------------------------

const BLOCK_STYLES: Record<string, string> = {
  p: 'normal',
  h1: 'h3',
  h2: 'h3',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  blockquote: 'blockquote',
}
const DECORATORS: Record<string, string> = {strong: 'strong', b: 'strong', em: 'em', i: 'em'}
const DROPPED = new Set(['img', 'figure', 'iframe', 'video', 'audio', 'script', 'style', 'table'])

type Token = {kind: 'tag'; name: string; closing: boolean; attrs: string} | {kind: 'text'; text: string}

function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  const pattern = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi
  let last = 0
  for (const match of html.matchAll(pattern)) {
    if (match.index > last) tokens.push({kind: 'text', text: html.slice(last, match.index)})
    tokens.push({kind: 'tag', name: match[2].toLowerCase(), closing: match[1] === '/', attrs: match[3]})
    last = match.index + match[0].length
  }
  if (last < html.length) tokens.push({kind: 'text', text: html.slice(last)})
  return tokens
}

function attribute(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  return match ? (match[1] ?? match[2]) : undefined
}

/**
 * Converts a WordPress answer to Portable Text blocks. Keys are `<prefix>-<block>`,
 * `<prefix>-<block>-<span>` and `<prefix>-<block>-l<link>`, so a re-run produces the same keys.
 *
 * Handles paragraphs, headings (H1/H2 become H3: the editor offers no higher), block quotes,
 * bullet and numbered lists, bold, italic, links and line breaks. Images, tables and embeds are
 * dropped, and so is a site-relative link (the editor's URL check rejects it); each is reported
 * in `issues` so an editor can restore it by hand. Text with no tags at all splits into
 * paragraphs on blank lines, as the classic editor stores it.
 */
export function htmlToBlocks(html: string, prefix: string): {blocks: PortableTextBlock[]; issues: string[]} {
  const issues: string[] = []
  const source = html.replace(/<!--[\s\S]*?-->/g, '')
  if (!source.trim()) return {blocks: [], issues}

  const hasTags = /<[a-z][a-z0-9]*\b/i.test(source)
  const tokens: Token[] = hasTags
    ? tokenize(source)
    : source
        .split(/\n\s*\n/)
        .flatMap((paragraph): Token[] => [
          {kind: 'tag', name: 'p', closing: false, attrs: ''},
          {kind: 'text', text: paragraph},
          {kind: 'tag', name: 'p', closing: true, attrs: ''},
        ])

  const blocks: PortableTextBlock[] = []
  let current: PortableTextBlock | null = null
  let blockStyle = 'normal'
  let quoteDepth = 0
  const lists: Array<'bullet' | 'number'> = []
  let marks: string[] = []
  let linkKey: string | null = null
  let skipDepth = 0
  let spanCount = 0
  let linkCount = 0

  const open = (style: string, list?: 'bullet' | 'number') => {
    const key = `${prefix}-${blocks.length}`
    current = {
      _type: 'block',
      _key: key,
      style,
      markDefs: [],
      children: [],
      ...(list ? {listItem: list, level: 1} : {}),
    }
    spanCount = 0
    linkCount = 0
    blocks.push(current)
  }
  const close = () => {
    if (!current) return
    // Trim the block's outer whitespace; drop it if nothing is left.
    const first = current.children[0]
    const lastChild = current.children[current.children.length - 1]
    if (first) first.text = first.text.replace(/^\s+/, '')
    if (lastChild) lastChild.text = lastChild.text.replace(/\s+$/, '')
    current.children = current.children.filter((child) => child.text !== '')
    if (current.children.length === 0) {
      blocks.pop()
    } else {
      current.children.forEach((child, index) => {
        child._key = `${current!._key}-${index}`
      })
    }
    current = null
  }
  const addText = (raw: string, verbatim = false) => {
    const text = verbatim ? raw : decodeEntities(raw).replace(/[ \t\r\n]+/g, ' ')
    if (!text.trim() && !current) return
    if (!current) open(quoteDepth ? 'blockquote' : blockStyle)
    const block = current as unknown as PortableTextBlock
    const spanMarks = [...marks, ...(linkKey ? [linkKey] : [])]
    const previous = block.children[block.children.length - 1]
    if (previous && previous.marks.join() === spanMarks.join()) {
      previous.text += text
    } else {
      block.children.push({_type: 'span', _key: `${block._key}-${spanCount++}`, text, marks: spanMarks})
    }
  }

  for (const token of tokens) {
    if (token.kind === 'text') {
      if (skipDepth === 0) addText(token.text)
      continue
    }
    const {name, closing, attrs} = token
    if (DROPPED.has(name)) {
      if (name === 'img') {
        issues.push(`${prefix}: an image was dropped from the answer${attribute(attrs, 'src') ? ` (${attribute(attrs, 'src')})` : ''}`)
      } else if (!closing) {
        issues.push(`${prefix}: a <${name}> was dropped from the answer`)
      }
      if (name !== 'img') skipDepth = Math.max(0, skipDepth + (closing ? -1 : 1))
      continue
    }
    if (skipDepth > 0) continue

    if (name === 'ul' || name === 'ol') {
      close()
      if (closing) lists.pop()
      else lists.push(name === 'ul' ? 'bullet' : 'number')
    } else if (name === 'li') {
      close()
      if (!closing) open('normal', lists[lists.length - 1] ?? 'bullet')
    } else if (name === 'blockquote') {
      close()
      quoteDepth = Math.max(0, quoteDepth + (closing ? -1 : 1))
    } else if (name in BLOCK_STYLES) {
      close()
      if (!closing) {
        const style = quoteDepth ? 'blockquote' : BLOCK_STYLES[name]
        if (name === 'h1' || name === 'h2') issues.push(`${prefix}: a <${name}> heading became a Heading 3`)
        blockStyle = style
        open(style)
      } else {
        blockStyle = 'normal'
      }
    } else if (name === 'br') {
      addText('\n', true)
    } else if (name in DECORATORS) {
      const mark = DECORATORS[name]
      marks = closing ? marks.filter((m) => m !== mark) : [...marks.filter((m) => m !== mark), mark]
    } else if (name === 'a') {
      if (closing) {
        linkKey = null
      } else {
        const href = attribute(attrs, 'href')?.trim()
        const decoded = href ? decodeEntities(href) : ''
        if (/^(https?:|mailto:|tel:)/i.test(decoded)) {
          if (!current) open('normal')
          const block = current as unknown as PortableTextBlock
          linkKey = `${block._key}-l${linkCount++}`
          block.markDefs.push({
            _type: 'link',
            _key: linkKey,
            linkType: 'href',
            href: decoded,
            openInNewTab: /^_blank$/i.test(attribute(attrs, 'target') ?? ''),
          })
        } else {
          linkKey = null
          issues.push(`${prefix}: a link to "${decoded || '(none)'}" was dropped, its text kept`)
        }
      }
    }
    // Any other tag (div, span, ...) is transparent: its text is kept.
  }
  close()
  return {blocks, issues}
}

// --- Plan ----------------------------------------------------------------------------------

/** Categories in the theme's order (`term_order`, then term id), numbered in steps of 10. */
export function planFaqCategories(terms: SnapshotFaqCategory[]): PlannedFaqCategory[] {
  return [...terms]
    .sort((a, b) => a.termOrder - b.termOrder || a.termId - b.termId)
    .map((term, index) => ({slug: term.slug, title: clean(term.name), order: (index + 1) * 10}))
}

/**
 * The published FAQs, each with its answer converted and a position within its category. Order
 * is category order, then `menu_order`, then WordPress id (every `menu_order` on the site is 0,
 * so in practice the order the questions were created). A FAQ in several categories takes the
 * first, which is reported, as is one with none or with no answer.
 */
export function planFaqs(snapshot: FaqSnapshot): {faqs: PlannedFaq[]; issues: string[]} {
  const issues: string[] = []
  const categoryOrder = new Map(planFaqCategories(snapshot.categories).map((c) => [c.slug, c.order]))
  const rank = (slug?: string) => (slug ? (categoryOrder.get(slug) ?? Number.MAX_SAFE_INTEGER - 1) : Number.MAX_SAFE_INTEGER)

  const staged = snapshot.faqs
    .filter((faq) => faq.status === 'publish')
    .map((faq) => {
      const sorted = [...faq.categories].sort((a, b) => rank(a.slug) - rank(b.slug))
      const question = clean(faq.question)
      const label = `FAQ ${faq.wpId} ("${question}")`
      if (sorted.length === 0) issues.push(`${label} has no category`)
      if (sorted.length > 1) issues.push(`${label} is in ${sorted.length} categories; kept the first (${sorted[0].slug})`)
      const converted = htmlToBlocks(faq.content, `wp${faq.wpId}`)
      if (converted.blocks.length === 0) issues.push(`${label} has no answer in WordPress`)
      converted.issues.forEach((issue) => issues.push(`${label}: ${issue.replace(/^wp\d+: /, '')}`))
      return {faq, question, categorySlug: sorted[0]?.slug, answer: converted.blocks}
    })
    .sort(
      (a, b) =>
        rank(a.categorySlug) - rank(b.categorySlug) || a.faq.menuOrder - b.faq.menuOrder || a.faq.wpId - b.faq.wpId,
    )

  const counters = new Map<string, number>()
  const faqs = staged.map(({faq, question, categorySlug, answer}): PlannedFaq => {
    const group = categorySlug ?? ''
    const position = (counters.get(group) ?? 0) + 1
    counters.set(group, position)
    return {
      wpId: faq.wpId,
      question,
      answer,
      ...(categorySlug ? {categorySlug} : {}),
      order: position * 10,
    }
  })
  return {faqs, issues}
}
