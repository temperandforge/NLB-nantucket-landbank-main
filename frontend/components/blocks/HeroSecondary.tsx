import {stegaClean} from 'next-sanity'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
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
    <section className="w-full">
      <div className="tf-px py-section-p-sm overflow-hidden">
        <div className="tf-max-w">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div
              className={`hero-secondary__panel--${variant} relative flex flex-col justify-between p-10 min-h-[320px] md:min-h-[420px]`}
            >
              <div
                className={`hero-secondary__lines hero-secondary__lines--${variant} absolute inset-0 pointer-events-none`}
                aria-hidden="true"
              />
              {eyebrow && (
                <Eyebrow className={`relative z-10 mb-3 ${TEXT[variant].eyebrow}`}>{eyebrow}</Eyebrow>
              )}
              {block.body && <p className={`relative z-10 ${TEXT[variant].body}`}>{block.body}</p>}
            </div>
            <BlockImage
              image={block.image}
              width={960}
              sizes="(min-width: 768px) 50vw, 100vw"
              fill
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
