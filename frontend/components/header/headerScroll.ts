/**
 * The header's hide-on-scroll-down, reveal-on-scroll-up rule, as a pure function so
 * scripts/verifyHeader.mts can check it without a browser.
 *
 * - Within `topOffset` of the page top (or above it, while rubber-banding) it is always shown.
 * - While `locked` (a menu is open or focus is inside the header) it is always shown.
 * - A move smaller than `delta` is ignored and the anchor is NOT advanced, so slow drift still
 *   adds up to a decision instead of being swallowed a few pixels at a time.
 */

export type HeaderScrollState = {hidden: boolean; lastY: number}

type Options = {topOffset?: number; delta?: number}

export function nextHeaderScroll(
  prev: HeaderScrollState,
  input: {y: number; locked: boolean},
  {topOffset = 80, delta = 8}: Options = {},
): HeaderScrollState {
  const {y, locked} = input
  if (locked || y <= topOffset) return {hidden: false, lastY: y}
  if (Math.abs(y - prev.lastY) < delta) return prev
  return {hidden: y > prev.lastY, lastY: y}
}
