import type {ComponentProps} from 'react'

import {ImageLightboxProvider} from '@/components/ImageLightbox'
import type {GalleryCard} from '@/sanity/lib/galleryCards'

import ImageCarouselSlide from './ImageCarouselSlide'
import ImageCarouselTrack from './ImageCarouselTrack'

/**
 * The carousel itself, for cards from galleryCards()/carouselCards(): the Track, a slide per card,
 * and the lightbox. Shared by the Image Carousel block and a property's gallery. The uploaded images,
 * in order, are one gallery in the lightbox; a related document is a link. Each use owns its own
 * lightbox, so two carousels on a page never page into each other's pictures.
 */
export default function GalleryCarousel({cards, label}: {cards: GalleryCard[]; label: string}) {
  const pictures = cards.flatMap((card) => {
    const id = card.image.asset?._ref
    if (!card.lightbox || !id) return []
    return [
      {
        key: card.key,
        id,
        alt: card.image.alt ?? '',
        caption: card.label,
        crop: card.image.crop as ComponentProps<typeof ImageLightboxProvider>['images'][number]['crop'],
      },
    ]
  })
  const pictureIndex = new Map(pictures.map((picture, index) => [picture.key, index]))
  return (
    <ImageLightboxProvider images={pictures}>
      <ImageCarouselTrack label={label}>
        {cards.map((card) => (
          <ImageCarouselSlide
            key={card.key}
            image={card.image as ComponentProps<typeof ImageCarouselSlide>['image']}
            label={card.label}
            href={card.href}
            external={card.external}
            lightboxIndex={card.lightbox ? pictureIndex.get(card.key) : undefined}
          />
        ))}
      </ImageCarouselTrack>
    </ImageLightboxProvider>
  )
}
