export type JumpNavItem = {id: string; text: string}

type SpanLike = {text?: string}
type BlockLike = {_key: string; _type: string; style?: string; children?: SpanLike[]}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Derives a jump nav from a Portable Text body: every H3 is a section. Returns the nav rows and
 * an id for each H3 keyed by its block _key, so the heading renderer and the nav agree. Ids are
 * unique within the block; a heading with no text still gets an id (so its anchor exists) but no
 * nav row.
 */
export function buildJumpNav(blocks: ReadonlyArray<BlockLike> | null | undefined) {
  const items: JumpNavItem[] = []
  const idByKey: Record<string, string> = {}
  const used = new Set<string>()

  for (const block of blocks ?? []) {
    if (block._type !== 'block' || block.style !== 'h3') continue
    const text = (block.children ?? [])
      .map((child) => child.text ?? '')
      .join('')
      .trim()
    const base = slugify(text) || 'section'
    let id = base
    let n = 2
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)
    idByKey[block._key] = id
    if (text) items.push({id, text})
  }

  return {items, idByKey}
}
