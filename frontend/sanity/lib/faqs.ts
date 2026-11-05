import {toPlainText, type PortableTextBlock} from 'next-sanity'

/**
 * Pulls every question out of a page's blocks, for the page's single FAQPage graph. FAQs reach a
 * page three ways: a `faqList` block (grouped and ungrouped FAQ documents), a `faqAccordion`
 * (items written on the page, inside a `jumpNavContent` block or a project's body), and a
 * property's referenced FAQs. Answers are flattened from Portable Text to plain text.
 */
export type FaqItem = {question?: string | null; answer?: unknown}

type Block = {_type?: string; [key: string]: unknown} | null | undefined

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

export function faqText(item: FaqItem): {question?: string | null; answer?: string} {
  const answer = asArray(item.answer)
  return {
    question: item.question,
    answer: answer.length > 0 ? toPlainText(answer as PortableTextBlock[]) : undefined,
  }
}

function fromBlock(block: Block): FaqItem[] {
  if (!block) return []
  if (block._type === 'faqAccordion') return asArray(block.items) as FaqItem[]
  if (block._type === 'faqList') {
    return [
      ...asArray(block.ungrouped),
      ...asArray(block.groups).flatMap((group) => asArray((group as {faqs?: unknown})?.faqs)),
    ] as FaqItem[]
  }
  // A block that holds other blocks (the jump-nav body) is searched one level down.
  if (block._type === 'jumpNavContent') return asArray(block.content).flatMap((inner) => fromBlock(inner as Block))
  return []
}

/** Questions from a list of blocks, in page order, as plain-text pairs ready for `faqPageLd`. */
export function faqItemsFromBlocks(blocks: unknown): {question?: string | null; answer?: string}[] {
  return asArray(blocks).flatMap((block) => fromBlock(block as Block)).map(faqText)
}

/** Questions from FAQ documents or inline items, e.g. a property's `faqs`. */
export function faqItemsFromList(items: unknown): {question?: string | null; answer?: string}[] {
  return (asArray(items) as (FaqItem | null)[]).flatMap((item) => (item ? [faqText(item)] : []))
}
