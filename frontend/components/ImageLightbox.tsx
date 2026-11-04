'use client'

import {createContext, type ReactNode, useContext, useMemo, useState} from 'react'

import GalleryLightbox, {type GalleryLightboxImage} from '@/components/GalleryLightbox'

type Opener = (index: number) => void

const OpenerContext = createContext<Opener | null>(null)

/**
 * Lets the slides of a carousel open their pictures in one gallery lightbox. It holds the list of
 * pictures (the carousel's uploaded images, in order) and which one is open, and renders the
 * dialog once beside its children, so a slide only asks to open its own picture by its place in
 * the list. The same dialog as the news page's gallery: next and previous, a counter, swipe and
 * arrow keys. Slides outside a provider have no lightbox.
 */
export function ImageLightboxProvider({
  images,
  children,
}: {
  images: GalleryLightboxImage[]
  children: ReactNode
}) {
  const [open, setOpen] = useState<number | null>(null)
  const opener = useMemo<Opener>(() => (index) => setOpen(index), [])
  return (
    <OpenerContext.Provider value={opener}>
      {children}
      <GalleryLightbox
        images={images}
        index={open}
        onChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </OpenerContext.Provider>
  )
}

/** Opens the picture at `index` in the surrounding provider's lightbox, or null with no provider. */
export function useImageLightbox(): Opener | null {
  return useContext(OpenerContext)
}
