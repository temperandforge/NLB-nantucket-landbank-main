import Image from 'next/image'

import ResolvedLink from '@/components/ResolvedLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

export default function CtaContact({block}: BlockProps<'ctaContact'>) {
  const link = block.button?.link as DereferencedLink | undefined
  const showButton = Boolean(block.button?.buttonText && link && linkResolver(link))

  return (
    <section className="relative flex w-full items-center justify-center bg-background p-5 md:p-10">
      <div className="tf-max-w">
        <div className="relative h-[33.75rem] w-full overflow-clip md:h-[38.125rem]">
          <BlockImage
            image={block.mobileImage}
            width={750}
            sizes="100vw"
            fill
            className="absolute inset-0 z-0 size-full object-cover object-center md:hidden"
          />
          <BlockImage
            image={block.desktopImage}
            width={1440}
            sizes="(min-width: 768px) 1440px, 0px"
            fill
            className="hidden object-cover object-center md:absolute md:inset-0 md:z-0 md:block md:size-full"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-mobile.svg"
            alt=""
            aria-hidden="true"
            fill
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center md:hidden"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-1.svg"
            alt=""
            aria-hidden="true"
            width={1703}
            height={248}
            className="pointer-events-none absolute top-[3.4%] left-[calc(50%-14.5rem)] z-0 hidden w-[177%] max-w-none -translate-x-1/2 md:block"
          />
          <Image
            src="/images/blocks/decorative-line-cta-contact-2.svg"
            alt=""
            aria-hidden="true"
            width={1523}
            height={238}
            className="pointer-events-none absolute top-[1.5%] left-1/2 z-0 hidden w-[159%] max-w-none -translate-x-1/2 md:block"
          />

          <div className="relative z-10 flex size-full flex-col items-center justify-center gap-8 px-5 text-center md:mx-auto md:w-[30.4375rem] md:gap-10 md:px-0">
            {block.heading && <h2 className="w-full text-headline-xl text-on-background text-pretty">{block.heading}</h2>}
            {block.body && (
              <p className="w-full font-sans text-body-base leading-[1.6] text-on-background">{block.body}</p>
            )}
            {showButton && link && (
              <ResolvedLink link={link} className="button button-secondary">
                {block.button?.buttonText}
              </ResolvedLink>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
