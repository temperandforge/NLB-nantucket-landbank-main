'use client'

import {useState} from 'react'

import GalleryLightbox, {type GalleryLightboxImage} from '@/components/GalleryLightbox'
import Image from '@/components/SanityImage'

export type GalleryGridImage = GalleryLightboxImage

/**
 * The tiles of an image gallery. Each tile is a button that opens the picture full size in the
 * gallery lightbox (see GalleryLightbox: focus is trapped, Escape closes, focus returns to the
 * tile). The tiles crop to 4:3; the dialog shows the whole picture.
 */
export default function GalleryGrid({images}: {images: GalleryGridImage[]}) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <>
      <div className="image-gallery__grid">
        {images.map((image, index) => (
          <figure key={image.key}>
            <button
              type="button"
              className="image-gallery__tile"
              onClick={() => setOpen(index)}
              aria-label={`View larger${image.alt ? `: ${image.alt}` : ''}`}
            >
              <Image
                id={image.id}
                alt=""
                width={820}
                sizes="(min-width: 820px) 400px, (min-width: 640px) 50vw, 100vw"
                crop={image.crop}
                hotspot={image.hotspot}
                mode="cover"
                className="aspect-[4/3] w-full rounded object-cover"
              />
            </button>
            {image.caption && <figcaption className="figure-caption">{image.caption}</figcaption>}
          </figure>
        ))}
      </div>

      <GalleryLightbox
        images={images}
        index={open}
        onChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
