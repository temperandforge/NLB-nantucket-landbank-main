/**
 * Keyboard movement for the multi-select listbox. Pure, so it is checked by
 * `node scripts/verifyFormLogic.mts` rather than by clicking through the browser.
 */

/** The next active option index for an arrow, Home or End key. -1 means no active option. */
export function moveActive(current: number, count: number, key: string): number {
  if (count <= 0) return -1
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : Math.min(current + 1, count - 1)
    case 'ArrowUp':
      return current < 0 ? count - 1 : Math.max(current - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return current
  }
}

/**
 * The option a typed prefix jumps to, searching from the current one and wrapping. A single
 * character moves on to the next option starting with it, so repeating a letter cycles.
 */
export function typeaheadMatch(options: string[], buffer: string, from: number): number {
  const needle = buffer.toLowerCase()
  if (!needle || options.length === 0) return -1
  const start = needle.length === 1 ? from + 1 : Math.max(from, 0)
  for (let i = 0; i < options.length; i += 1) {
    const index = (start + i) % options.length
    if (options[index].toLowerCase().startsWith(needle)) return index
  }
  return -1
}
