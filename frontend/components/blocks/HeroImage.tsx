import Image from 'next/image'

import Cascade from '@/components/Cascade'
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroImage({block, pageName}: BlockProps<'heroImage'>) {
  const eyebrow = block.eyebrow || pageName

  return (
    <div className="relative flex w-full overflow-clip tf-px pt-s3 pb-s9">
      <BlockImage
        image={block.image}
        width={1920}
        sizes="100vw"
        fill
        priority
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="relative z-10 tf-max-w">
        <div className="relative flex h-[380px] w-full flex-col items-start justify-between overflow-clip rounded bg-background p-5 sm:w-[680px] sm:p-10">
          <Image
            src="/images/blocks/decorative-line-hero.svg"
            alt=""
            aria-hidden="true"
            fill
            className="pointer-events-none absolute inset-y-[-30%] inset-x-[-60%] z-0 size-auto object-contain opacity-60"
          />
          {eyebrow && (
            <Eyebrow className="relative z-10 text-on-background load-in">{eyebrow}</Eyebrow>
          )}
          {block.heading && (
            <Cascade
              as="h1"
              className="relative z-10 w-full text-headline-xl text-on-background [text-wrap:pretty]"
              text={block.heading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
