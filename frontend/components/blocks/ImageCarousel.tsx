import {carouselCards, DEFAULT_NEWS_LIMIT} from '@/sanity/lib/carouselCards'

import GalleryCarousel from './GalleryCarousel'
import {BlockProps} from './types'

/**
 * The Image Carousel block: hand-picked images and documents, a project category, or the latest news
 * in a category (DECISIONS 26, 27, 28). Cards are decided by carouselCards; with none, nothing is
 * drawn, not even the eyebrow.
 */
export default function ImageCarousel({block}: BlockProps<'imageCarousel'>) {
  const cards = carouselCards(block.entries, {
    defaultImage: block.defaultImage,
    limit: block.source === 'newsCategory' ? (block.limit ?? DEFAULT_NEWS_LIMIT) : undefined,
  })
  if (cards.length === 0) return null
  return (
    <section className="w-full overflow-x-clip bg-background py-s6">
      <div className="flex w-full flex-col items-center gap-16">
        {block.eyebrow && (
          <div className="tf-max-w tf-px">
            <div className="flex items-center justify-center rounded bg-tag px-2 py-1 text-balance">
              <span className="tag-label">{block.eyebrow}</span>
            </div>
          </div>
        )}
        <GalleryCarousel cards={cards} label={block.eyebrow || 'Image carousel'} />
      </div>
    </section>
  )
}
