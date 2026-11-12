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
        <div className="relative flex h-[380px] w-full flex-col items-start justify-between overflow-clip rounded bg-background p-5 sm:max-w-[680px] sm:p-10">
          {/* Figma draws each version at its natural size, offset from the panel corner, and the panel
              crops it. The mobile drawing is not a scaled desktop one (its curves differ). */}
          <Image
            src="/images/blocks/decorative-line-hero-mobile.svg"
            alt=""
            aria-hidden="true"
            width={1340.74}
            height={1281.32}
            className="pointer-events-none absolute top-[-494px] left-[-244px] z-0 max-w-none sm:hidden"
          />
          <Image
            src="/images/blocks/decorative-line-hero.svg"
            alt=""
            aria-hidden="true"
            width={1340.74}
            height={1281.32}
            className="pointer-events-none absolute top-[-494px] left-[-244px] z-0 hidden max-w-none sm:block"
          />
          {eyebrow && (
            <Eyebrow className="relative z-10 text-on-background load-in">{eyebrow}</Eyebrow>
          )}
          {block.heading && (
            <Cascade
              as="h1"
              className="relative z-10 w-full text-headline-xl text-on-background text-balance"
              text={block.heading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
