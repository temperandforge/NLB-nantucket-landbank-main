import {stegaClean} from 'next-sanity'

/** Cap on the per-word delay index (applied by the Cascade component), so a long headline never waits long to finish. */
export const CASCADE_MAX_INDEX = 14

/** The same cap for a hero description: longer text, a much smaller per-word step (see motion.css). */
export const CASCADE_BODY_MAX_INDEX = 48

/**
 * Splits a headline into words for the cascade. Returns [] when there is nothing to render
 * (empty, whitespace-only, null, undefined), and null ONLY when the text carries stega
 * (visual-editing) characters: splitting those would break the encoded click-to-edit markers,
 * so the caller renders the text whole.
 */
export function cascadeWords(text: string | null | undefined): string[] | null {
  if (!text) return []
  if (stegaClean(text) !== text) return null
  // ASCII whitespace only: an authored non-breaking space (U+00A0) keeps its words together.
  return text.split(/[ \t\r\n\f]+/).filter(Boolean)
}
