import Link from 'next/link'

import {ArrowForwardIcon} from '@/components/icons'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

// Collapsed and expanded sizes from the Figma carousel (368 x 460, and 416 x 520 on hover).
const CARD =
  'group/card relative flex h-[325px] w-[260px] flex-none snap-start items-end justify-center overflow-clip rounded bg-dusty-heath-800 p-6 transition-[width,height] duration-300 ease-out md:h-[460px] md:w-[368px] hover:h-[364px] hover:w-[292px] focus-visible:h-[364px] focus-visible:w-[292px] md:hover:h-[520px] md:hover:w-[416px] md:focus-visible:h-[520px] md:focus-visible:w-[416px]'

export default function ImageCarousel({block}: BlockProps<'imageCarousel'>) {
  const images = block.images?.filter((item) => item.image?.asset?._ref) ?? []
  return (
    <section className="w-full overflow-x-clip bg-background py-s6">
      <div className="flex w-full flex-col items-center gap-16">
        {block.eyebrow && (
          <div className="flex items-center justify-center rounded bg-tag px-2 py-1">
            <span className="tag-label">{block.eyebrow}</span>
          </div>
        )}
        {images.length > 0 && (
          <div
            className="image-carousel__track flex w-full items-center gap-6 overflow-x-auto px-10"
            role="region"
            aria-label={block.eyebrow || 'Image carousel'}
            tabIndex={0}
          >
            {images.map((item) => {
              // A link that does not resolve leaves a plain card, never a dead anchor.
              const href = realHref(item.link ? linkResolver(item.link as DereferencedLink) : null)
              const content = (
                <>
                  <BlockImage
                    image={item.image}
                    width={832}
                    sizes="(min-width: 768px) 416px, 292px"
                    fill
                    className="absolute inset-0 size-full object-cover"
                  />
                  {item.caption && (
                    <>
                      <span
                        className="pointer-events-none absolute inset-0 bg-hover-green opacity-0 transition-opacity duration-300 group-hover/card:opacity-85 group-focus-visible/card:opacity-85"
                        aria-hidden="true"
                      />
                      <span className="relative flex w-full items-center gap-4 text-on-accent-secondary opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
                        <span className="flex-1 font-mono text-body-small leading-[1.6] tracking-wide uppercase">
                          {item.caption}
                        </span>
                        <ArrowForwardIcon className="size-6 shrink-0" />
                      </span>
                    </>
                  )}
                </>
              )
              return (
                <div key={item._key} className="image-carousel__slide flex flex-none items-center">
                  {href ? (
                    <Link href={href} className={CARD} aria-label={item.caption || undefined}>
                      {content}
                    </Link>
                  ) : (
                    <div className={CARD} tabIndex={item.caption ? 0 : undefined}>
                      {content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
