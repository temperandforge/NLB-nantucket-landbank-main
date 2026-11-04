'use client'

import {useCallback, useEffect, useRef} from 'react'

import {ArrowLeftIcon, ArrowRightIcon, CloseIcon} from '@/components/icons'
import Image from '@/components/SanityImage'

export type GalleryLightboxImage = {
  key: string
  /** The image asset's _ref. */
  id: string
  alt: string
  caption?: string | null
  crop?: React.ComponentProps<typeof Image>['crop']
  hotspot?: React.ComponentProps<typeof Image>['hotspot']
}

/** Movement before a touch counts as a swipe rather than a tap, in px. */
const SLOP = 8
/** Distance that commits a swipe: sideways changes image, down closes. */
const SWIPE_X = 50
const SWIPE_DOWN = 80

/**
 * The size, in pixels, an image has once cropped, read from its asset id (`image-<hash>-<w>x<h>-<ext>`),
 * or null when the id does not say. The lightbox never shows a picture larger than this.
 */
function pictureSize(
  id: string,
  crop?: {
    top?: number | null
    bottom?: number | null
    left?: number | null
    right?: number | null
  } | null,
): {width: number; height: number} | null {
  const match = /^image-[0-9a-z]+-(\d+)x(\d+)-[a-z0-9]+$/i.exec(id)
  if (!match) return null
  const width = Number(match[1]) * (1 - (crop?.left ?? 0) - (crop?.right ?? 0))
  const height = Number(match[2]) * (1 - (crop?.top ?? 0) - (crop?.bottom ?? 0))
  return width > 0 && height > 0 ? {width: Math.floor(width), height: Math.floor(height)} : null
}

type Gesture = {id: number; x: number; y: number; axis: 'x' | 'y' | null; dx: number; dy: number}

/**
 * A set of pictures shown full size in a native dialog, one at a time. It is controlled: it is open
 * while `index` is a number, `onChange` is asked for the next index when the visitor steps, and
 * `onClose` is called when the dialog closes however that happened. Focus is trapped, Escape closes,
 * and focus returns to whatever opened it. The full-size image is not requested until the dialog
 * opens. On touch the picture follows a drag: sideways changes image, down closes. Mouse is not
 * handled (the buttons, arrow keys and backdrop click cover it), and every gesture has a button
 * twin. With one picture there is nothing to step through, so the arrows and counter are left out.
 *
 * Shared by the news article's image gallery (GalleryGrid) and the property carousel
 * (ImageLightboxProvider). Styled by `.lightbox` in css/ui.css.
 */
export default function GalleryLightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: GalleryLightboxImage[]
  index: number | null
  onChange: (index: number) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const gesture = useRef<Gesture | null>(null)
  // A swipe that ends on the backdrop must not also count as a click on it.
  const swiped = useRef(false)
  const isOpen = index !== null
  const many = images.length > 1

  const close = useCallback(() => dialogRef.current?.close(), [])

  const step = useCallback(
    (direction: 1 | -1) => {
      if (index === null || images.length < 2) return
      onChange((index + direction + images.length) % images.length)
    },
    [index, images.length, onChange],
  )

  // The dialog follows `index`. Opening twice is harmless, which matters: in development React
  // mounts, cleans up and mounts again.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // Hold the page still behind the dialog; showModal does not.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previous
    }
  }, [isOpen])

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
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      axis: null,
      dx: 0,
      dy: 0,
    }
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
      if (many) el.style.transform = `translateX(${g.dx}px)`
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
    if (!cancelled && g.axis === 'x' && many && Math.abs(g.dx) > SWIPE_X) {
      step(g.dx < 0 ? 1 : -1)
    } else if (!cancelled && g.axis === 'y' && g.dy > SWIPE_DOWN) {
      reset(false)
      close()
    } else {
      reset(true)
    }
  }

  const current = index === null ? null : images[index]
  const size = current ? pictureSize(current.id, current.crop) : null

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label="Image gallery"
      onClose={onClose}
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
      {current && index !== null && (
        <>
          <figure key={current.key} className="lightbox__figure">
            <Image
              id={current.id}
              alt={current.alt}
              width={1600}
              // `sizes` says how wide it is drawn, and the browser takes that as its natural size, so
              // "100vw" would stretch a small picture to fill the screen. Cap it at the picture's own.
              sizes={size ? `min(100vw, ${size.width}px)` : '100vw'}
              crop={current.crop}
              className="lightbox__image"
              style={
                size
                  ? {
                      maxWidth: `min(100%, ${size.width}px)`,
                      maxHeight: `min(calc(100dvh - 11rem), ${size.height}px)`,
                    }
                  : undefined
              }
            />
            {current.caption && (
              <figcaption className="lightbox__caption">{current.caption}</figcaption>
            )}
          </figure>
          {many && (
            <p className="lightbox__count" aria-live="polite">
              {index + 1} / {images.length}
            </p>
          )}
          <button
            type="button"
            className="lightbox__button lightbox__close"
            onClick={close}
            aria-label="Close"
          >
            <CloseIcon className="size-6" />
          </button>
          {many && (
            <>
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
        </>
      )}
    </dialog>
  )
}
