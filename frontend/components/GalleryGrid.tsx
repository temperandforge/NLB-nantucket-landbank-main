'use client'

import {useCallback, useEffect, useRef, useState} from 'react'

import {ArrowLeftIcon, ArrowRightIcon, CloseIcon} from '@/components/icons'
import Image from '@/components/SanityImage'

export type GalleryGridImage = {
  key: string
  /** The image asset's _ref. */
  id: string
  alt: string
  caption?: string
  crop?: React.ComponentProps<typeof Image>['crop']
  hotspot?: React.ComponentProps<typeof Image>['hotspot']
}

/** Movement before a touch counts as a swipe rather than a tap, in px. */
const SLOP = 8
/** Distance that commits a swipe: sideways changes image, down closes. */
const SWIPE_X = 50
const SWIPE_DOWN = 80

type Gesture = {id: number; x: number; y: number; axis: 'x' | 'y' | null; dx: number; dy: number}

/**
 * The tiles of an image gallery. Each tile is a button that opens the picture full size in a native
 * dialog (focus is trapped, Escape closes, focus returns to the tile). The tiles crop to 4:3; the
 * dialog shows the whole picture. The full-size image is not requested until the dialog opens.
 * On touch the picture follows a drag: sideways changes image, down closes. Mouse is not handled
 * (the buttons, arrow keys and backdrop click cover it), and every gesture has a button twin.
 */
export default function GalleryGrid({images}: {images: GalleryGridImage[]}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<number | null>(null)
  const gesture = useRef<Gesture | null>(null)
  // A swipe that ends on the backdrop must not also count as a click on it.
  const swiped = useRef(false)

  const close = useCallback(() => dialogRef.current?.close(), [])

  const step = useCallback(
    (direction: 1 | -1) =>
      setOpen((current) =>
        current === null ? current : (current + direction + images.length) % images.length,
      ),
    [images.length],
  )

  // Hold the page still behind the dialog; showModal does not.
  useEffect(() => {
    if (open === null) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previous
    }
  }, [open])

  const figure = () => dialogRef.current?.querySelector<HTMLElement>('.lightbox__figure') ?? null

  function reset(animate: boolean) {
    const el = figure()
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.style.transition =
      animate && !calm
        ? 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)'
        : 'none'
    el.style.transform = ''
    el.style.opacity = ''
  }

  function onPointerDown(event: React.PointerEvent<HTMLDialogElement>) {
    if (event.pointerType === 'mouse' || !event.isPrimary) return
    if ((event.target as HTMLElement).closest('button')) return
    gesture.current = {id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, dx: 0, dy: 0}
  }

  function onPointerMove(event: React.PointerEvent<HTMLDialogElement>) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    g.dx = event.clientX - g.x
    g.dy = event.clientY - g.y
    if (!g.axis) {
      if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) < SLOP) return
      g.axis = Math.abs(g.dx) > Math.abs(g.dy) ? 'x' : 'y'
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const el = figure()
    if (!el) return
    el.style.transition = 'none'
    if (g.axis === 'x') {
      el.style.transform = `translateX(${g.dx}px)`
    } else if (g.dy > 0) {
      // Fade as it is pulled down, so it reads as being dismissed.
      el.style.transform = `translateY(${g.dy}px)`
      el.style.opacity = String(Math.max(0.3, 1 - g.dy / 400))
    }
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDialogElement>, cancelled: boolean) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    gesture.current = null
    if (!g.axis) return
    swiped.current = true
    window.setTimeout(() => (swiped.current = false), 60)
    if (!cancelled && g.axis === 'x' && Math.abs(g.dx) > SWIPE_X) {
      step(g.dx < 0 ? 1 : -1)
    } else if (!cancelled && g.axis === 'y' && g.dy > SWIPE_DOWN) {
      reset(false)
      close()
    } else {
      reset(true)
    }
  }

  function show(index: number) {
    setOpen(index)
    dialogRef.current?.showModal()
  }

  const current = open === null ? null : images[open]

  return (
    <>
      <div className="image-gallery__grid">
        {images.map((image, index) => (
          <figure key={image.key}>
            <button
              type="button"
              className="image-gallery__tile"
              onClick={() => show(index)}
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

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="Image gallery"
        onClose={() => setOpen(null)}
        onClick={(event) => {
          // A click on the dialog itself, not on its content, is a click on the backdrop.
          if (event.target === event.currentTarget && !swiped.current) close()
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => onPointerEnd(event, false)}
        onPointerCancel={(event) => onPointerEnd(event, true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1)
          else if (event.key === 'ArrowLeft') step(-1)
        }}
      >
        {current && open !== null && (
          <>
            <figure key={current.key} className="lightbox__figure">
              <Image
                id={current.id}
                alt={current.alt}
                width={1600}
                sizes="100vw"
                crop={current.crop}
                className="lightbox__image"
              />
              {current.caption && <figcaption className="lightbox__caption">{current.caption}</figcaption>}
            </figure>
            <p className="lightbox__count" aria-live="polite">
              {open + 1} / {images.length}
            </p>
            <button type="button" className="lightbox__button lightbox__close" onClick={close} aria-label="Close">
              <CloseIcon className="size-6" />
            </button>
            <button
              type="button"
              className="lightbox__button lightbox__prev"
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              <ArrowLeftIcon className="size-6" />
            </button>
            <button
              type="button"
              className="lightbox__button lightbox__next"
              onClick={() => step(1)}
              aria-label="Next image"
            >
              <ArrowRightIcon className="size-6" />
            </button>
          </>
        )}
      </dialog>
    </>
  )
}
