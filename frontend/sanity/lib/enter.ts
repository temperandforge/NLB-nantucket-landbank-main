/** How many page blocks, counted from the top, animate on load. Everything after animates on scroll. */
export const ENTER_LOAD_BLOCKS = 2

export type EnterAttrs = {'data-enter': 'load' | 'scroll'; 'data-enter-order'?: string}

/**
 * Block types that are long lists of cards. Directly under a hero they would land in the load layer,
 * where every card animates on a timer at page load, so the ones below the first screen have
 * finished by the time they are scrolled to. They always use the scroll layer instead (unless they
 * are the very first block), so each card enters as it comes into view.
 */
const SCROLL_ONLY_BLOCKS: readonly string[] = ['peopleGrid']

/**
 * The attributes motion.css keys on. The first `ENTER_LOAD_BLOCKS` blocks play on load, staggered
 * after the headline (order 0 then 1); every later block animates as it scrolls into view. A bad
 * index (negative, fractional, NaN, missing) lands on the scroll layer, which is static in browsers
 * without scroll-driven animations, so it can never hide content. `blockType` is the page-builder
 * `_type`; the list blocks in `SCROLL_ONLY_BLOCKS` skip the load layer unless they are block 0.
 */
export function enterAttrs(index: number, blockType?: string): EnterAttrs {
  if (Number.isInteger(index) && index >= 0 && index < ENTER_LOAD_BLOCKS) {
    if (index > 0 && blockType && SCROLL_ONLY_BLOCKS.includes(blockType)) return {'data-enter': 'scroll'}
    return {'data-enter': 'load', 'data-enter-order': String(index)}
  }
  return {'data-enter': 'scroll'}
}
