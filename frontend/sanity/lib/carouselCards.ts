import {type CardImage, type GalleryCard, type GalleryEntry, galleryCards} from './galleryCards.ts'

/** How many articles a "latest news" carousel shows when the editor has not set a number. */
export const DEFAULT_NEWS_LIMIT = 8

/**
 * The cards of an Image Carousel block, from entries in the same shape a property's gallery uses
 * (see galleryCards for what is dropped).
 *
 * - A project with no image of its own takes `defaultImage`, as the block always did. News, events
 *   and properties with no image are dropped, never given a stand-in.
 * - `limit` caps the result, and is applied after cards are dropped, so "latest 8" is 8 cards that
 *   are actually shown. Only the news source passes one.
 */
export function carouselCards(
  entries: GalleryEntry[] | null | undefined,
  options: {defaultImage?: CardImage | null; limit?: number | null} = {},
): GalleryCard[] {
  const {defaultImage, limit} = options
  const filled = (entries ?? []).map((entry): GalleryEntry => {
    const doc = entry.doc
    if (doc?.docType !== 'project' || doc.image?.asset?._ref || !defaultImage?.asset?._ref) {
      return entry
    }
    return {...entry, doc: {...doc, image: defaultImage}}
  })
  const cards = galleryCards(filled)
  return limit && limit > 0 ? cards.slice(0, limit) : cards
}
