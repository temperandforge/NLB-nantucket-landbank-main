import {stegaClean} from 'next-sanity'

/** Words past this index share the last delay, so a long headline never waits long to finish. */
export const CASCADE_MAX_INDEX = 14

/**
 * Splits a headline into words for the cascade. Returns null when there is nothing to render, or
 * when the text carries stega (visual-editing) characters: splitting those would break the
 * encoded click-to-edit markers, so the caller renders the text whole.
 */
export function cascadeWords(text: string | null | undefined): string[] | null {
  if (!text) return null
  if (stegaClean(text) !== text) return null
  const words = text.split(/\s+/).filter(Boolean)
  return words.length > 0 ? words : null
}
