import {stegaClean} from 'next-sanity'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import HeroSecondaryLines from './HeroSecondaryLines'
import {BlockProps} from './types'

const TEXT = {
  lowlands: {eyebrow: 'text-warm-neutral-50', body: 'text-warm-neutral-50'},
  'moody-moor': {eyebrow: 'text-warm-neutral-50', body: 'text-warm-neutral-50'},
  // Light panel: dark text, and the larger body size from the Figma page header.
  'light-brown': {
    eyebrow: 'text-moody-moor-600',
    body: 'text-moody-moor-600 text-body-large leading-[1.6]',
  },
}

export default function HeroSecondary({block, pageName}: BlockProps<'heroSecondary'>) {
  // stegaClean: in Presentation the value carries invisible stega characters.
  const chosen = stegaClean(block.variant)
  const variant = chosen === 'moody-moor' || chosen === 'light-brown' ? chosen : 'lowlands'
  const eyebrow = block.eyebrow || pageName
  return (
    <section className="bg-background w-full">
      <div className="tf-px py-section-p-sm overflow-hidden">
        <div className="tf-max-w">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div
              className={`hero-secondary__panel--${variant} relative flex flex-col justify-between p-5 gap-y-10 min-h-[420px] md:p-10 md:min-h-[560px]`}
            >
              <HeroSecondaryLines variant={variant} />
              {eyebrow && (
                <Eyebrow className={`relative z-10 mb-3 load-in ${TEXT[variant].eyebrow}`}>{eyebrow}</Eyebrow>
              )}
              {block.body && (
                <p className={`relative z-10 load-in ${TEXT[variant].body}`}>{block.body}</p>
              )}
            </div>
            {/* The image is absolutely positioned inside this box so its intrinsic height can't
                stretch the grid row: the text panel sets the height on desktop, 420px on mobile. */}
            <div className="relative h-[420px] md:h-auto">
              <BlockImage
                image={block.image}
                width={960}
                sizes="(min-width: 768px) 50vw, 100vw"
                fill
                priority
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
