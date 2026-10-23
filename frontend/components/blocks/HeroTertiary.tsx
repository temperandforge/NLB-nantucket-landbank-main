import Image from 'next/image'
import {stegaClean} from 'next-sanity'

import Cascade from '@/components/Cascade'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroTertiary({block}: BlockProps<'heroTertiary'>) {
  // stegaClean: in Presentation the value carries invisible characters.
  const Heading = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'

  return (
    <section className="relative w-full overflow-clip">
      {/* The frame the art is positioned against. The SVG is the Figma line with its rotation baked
          in and extended past the 1440px frame, in the frame's own pixel coordinates, so it is
          placed at fixed offsets and never scaled. The full-bleed section does the clipping. The
          mobile frame shows a different stretch of the same line, hence the second offset. */}
      <div className="tf-max-w relative px-5 py-s3 md:px-10">
        <Image
          src="/images/blocks/decorative-line-hero-tertiary-wide.svg"
          alt=""
          aria-hidden="true"
          width={5400}
          height={1300}
          className="pointer-events-none absolute top-[-244px] left-[-2188px] z-0 h-auto w-[5400px]! max-w-none md:top-1/2 md:left-[-1500px] md:-translate-y-[470px]"
        />
        <div className="relative flex w-full flex-col items-start gap-2.5 md:flex-row md:flex-wrap md:justify-between md:gap-x-10">
          <div className="flex max-w-[34.5rem] flex-col items-start gap-5 text-on-background md:gap-6">
            {block.eyebrow && <Eyebrow className="whitespace-nowrap load-in">{block.eyebrow}</Eyebrow>}
            {block.heading && <Cascade as={Heading} className="text-headline-2xl leading-[1.05]" text={block.heading} />}
          </div>
          {block.body && (
            <p
              className="max-w-[41.75rem] pt-[2.875rem] font-sans text-body-base leading-[1.6] text-on-background load-in"
              style={{'--load-in-step': 1} as React.CSSProperties}
            >
              {block.body}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
