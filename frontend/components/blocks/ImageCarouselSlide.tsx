'use client'

import Link from 'next/link'
import type {ComponentProps} from 'react'

import {ArrowForwardIcon} from '@/components/icons'
import {useImageLightbox} from '@/components/ImageLightbox'

import BlockImage from './BlockImage'

// Sizes from the Figma carousel: a 368 x 460 card, 416 x 520 when it is the current one (260 x 325
// and 292 x 364 on mobile). Both are 4:5, so the current card is the resting card scaled about its
// centre. The slide is the card itself: until the Track has measured (or without JavaScript) cards
// sit in a scrollable row, and once it has (`data-ready`) every card is pinned to the middle of the
// track and the Track moves and scales it with a transform. `--w` is set by the Track, from 0 (a
// resting card) to 1 (the current one), and drives the label.
const CARD =
  'group/card relative flex h-[325px] w-[260px] flex-none items-end justify-center overflow-clip rounded bg-dusty-heath-800 p-6 text-left will-change-transform in-data-[ready]:absolute in-data-[ready]:top-1/2 in-data-[ready]:left-1/2 in-data-[ready]:-mt-[162.5px] in-data-[ready]:-ml-[130px] md:h-[460px] md:w-[368px] md:in-data-[ready]:-mt-[230px] md:in-data-[ready]:-ml-[184px]'

type SlideImage = ComponentProps<typeof BlockImage>['image']

/**
 * One Image Carousel slide: an image and, when it has a label, the label over a green wash that
 * appears as the slide becomes the current one. It is one of:
 *  - a link (`href`), to a page, or to another site when `external`;
 *  - a button that opens its picture in the surrounding gallery lightbox (`lightboxIndex`, its
 *    place among the carousel's pictures; see ImageLightboxProvider);
 *  - a plain focusable card.
 * Shared by the Image Carousel block (projects) and the property page's gallery, and rendered
 * inside the Image Carousel Track, which sizes, places and focuses it, and which centres a slide
 * that is not the current one instead of letting its click through.
 */
export default function ImageCarouselSlide({
  image,
  label,
  href,
  external = false,
  lightboxIndex,
}: {
  image?: SlideImage
  label?: string | null
  href?: string | null
  external?: boolean
  lightboxIndex?: number
}) {
  const openLightbox = useImageLightbox()
  const content = (
    <>
      <BlockImage
        image={image}
        width={832}
        sizes="(min-width: 768px) 416px, 292px"
        fill
        className="absolute inset-0 size-full object-cover"
      />
      {label && (
        <>
          <span
            className="pointer-events-none absolute inset-0 bg-hover-green"
            style={{opacity: 'calc(var(--w, 0) * 0.85)'}}
            aria-hidden="true"
          />
          <span
            className="relative flex w-full items-center gap-4 text-on-accent-secondary"
            style={{opacity: 'var(--w, 0)'}}
          >
            <span className="flex-1 font-mono text-body-small leading-[1.6] tracking-wide uppercase">
              {label}
            </span>
            <ArrowForwardIcon className="size-6 shrink-0" />
          </span>
        </>
      )}
    </>
  )

  if (href && external) {
    return (
      <a
        href={href}
        className={CARD}
        aria-label={label ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
      >
        {content}
      </a>
    )
  }
  if (href) {
    return (
      <Link href={href} className={CARD} aria-label={label ?? undefined} draggable={false}>
        {content}
      </Link>
    )
  }
  if (lightboxIndex !== undefined && openLightbox) {
    const alt = image?.alt ?? ''
    return (
      <button
        type="button"
        className={CARD}
        aria-label={`View larger${label || alt ? `: ${label || alt}` : ''}`}
        aria-haspopup="dialog"
        onClick={() => openLightbox(lightboxIndex)}
      >
        {content}
      </button>
    )
  }
  return (
    <div className={CARD} tabIndex={0}>
      {content}
    </div>
  )
}
