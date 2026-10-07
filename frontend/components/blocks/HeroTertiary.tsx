import Image from 'next/image'
import {stegaClean} from 'next-sanity'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroTertiary({block}: BlockProps<'heroTertiary'>) {
  // stegaClean: in Presentation the value carries invisible characters.
  const Heading = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s3">
      <div className="relative flex w-full flex-wrap items-start justify-between gap-10 tf-max-w">
        <Image
          src="/images/blocks/decorative-line-hero-tertiary.svg"
          alt=""
          aria-hidden="true"
          width={6072}
          height={4934}
          className="pointer-events-none absolute top-1/2 left-0 z-0 w-[104vw]! max-w-none -translate-y-[49%]"
        />
        <div className="relative z-10 flex max-w-[34.5rem] flex-col items-start gap-6 text-on-background">
          {block.eyebrow && <Eyebrow className="whitespace-nowrap">{block.eyebrow}</Eyebrow>}
          {block.heading && <Heading className="text-headline-2xl leading-[1.05]">{block.heading}</Heading>}
        </div>
        {block.body && (
          <p className="relative z-10 max-w-[42rem] pt-0 font-sans text-body-base leading-[1.6] text-on-background md:pt-[2.875rem]">
            {block.body}
          </p>
        )}
      </div>
    </section>
  )
}
