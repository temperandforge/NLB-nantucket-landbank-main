/** How many page blocks, counted from the top, animate on load. Everything after animates on scroll. */
export const ENTER_LOAD_BLOCKS = 2

export type EnterAttrs = {'data-enter': 'load' | 'scroll'; 'data-enter-order'?: string}

/**
 * The attributes motion.css keys on. The first `ENTER_LOAD_BLOCKS` blocks play on load, staggered
 * after the headline (order 0 then 1); every later block animates as it scrolls into view. A bad
 * index (negative, fractional, NaN, missing) lands on the scroll layer, which is static in browsers
 * without scroll-driven animations, so it can never hide content.
 */
export function enterAttrs(index: number): EnterAttrs {
  if (Number.isInteger(index) && index >= 0 && index < ENTER_LOAD_BLOCKS) {
    return {'data-enter': 'load', 'data-enter-order': String(index)}
  }
  return {'data-enter': 'scroll'}
}
