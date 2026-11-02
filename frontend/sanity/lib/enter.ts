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

/**
 * What counts as a *part* of a page block: the outermost heading, paragraph, image, list item or
 * button (or anything marked data-part), excluding text that already cascades, the eyebrow and
 * aria-hidden decoration. css/motion.css writes this out in full (scripts/verifyMotionCss.mts checks
 * the two stay identical); ScrollReveal uses it to find the parts to hold back below the screen.
 */
const PARTS = ':is(h1,h2,h3,h4,h5,h6,p,img,picture,figure,blockquote,ul>li,ol>li,.button,[data-part])'
export const PART_SELECTOR = `${PARTS}:not(${PARTS} ${PARTS}):not(:has(.cascade-word)):not(.load-in):not([aria-hidden="true"]):not([aria-hidden="true"] *):not([data-morph] *)`
