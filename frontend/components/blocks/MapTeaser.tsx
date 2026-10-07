import Image from 'next/image'

import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function MapTeaser({block}: BlockProps<'mapTeaser'>) {
  const project = block.featuredProject
  const buttonHref = realHref(
    block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null,
  )
  const showButton = Boolean(block.button?.buttonText && buttonHref)

  return (
    <section className="w-full bg-background tf-px py-10">
      <div className="tf-max-w flex flex-col lg:flex-row">
        <div className="relative flex min-h-[28rem] flex-1 flex-col justify-between gap-16 overflow-clip bg-accent-primary p-10 lg:h-[620px] lg:min-h-0">
          <div className="map-teaser__lines pointer-events-none absolute inset-0" aria-hidden="true" />
          {block.eyebrow && (
            <Eyebrow className="relative z-10 text-on-accent-primary">{block.eyebrow}</Eyebrow>
          )}
          <div className="relative z-10 flex w-full flex-col items-start gap-6 text-on-accent-primary">
            {block.heading && <h2 className="w-full text-headline-xl">{block.heading}</h2>}
            {block.body && (
              <p className="w-full font-sans text-body-large leading-[1.6]">{block.body}</p>
            )}
          </div>
        </div>

        <div className="relative min-h-[34rem] flex-1 overflow-clip bg-surface-dark lg:h-[620px] lg:min-h-0">
          <Image
            src="/images/blocks/map-outline.svg"
            alt=""
            aria-hidden="true"
            width={985}
            height={570}
            className="pointer-events-none absolute left-[-123px] top-[10.59px] h-[569.646px] w-[984.732px] max-w-none"
          />
          <Image
            src="/images/blocks/map-pin.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={46}
            className="pointer-events-none absolute left-[223px] top-[346px] h-[46.2237px] w-[40px] max-w-none"
          />
          {project?.name && (
            <div className="absolute left-1/2 top-[93px] w-[262px] -translate-x-1/2 overflow-clip rounded-[6px] drop-shadow-[0_8px_10px_rgba(0,0,0,0.04)] lg:left-[39.5%] lg:translate-x-0">
              <div className="relative h-[134px] w-full bg-dusty-heath-800">
                <BlockImage
                  image={project.image}
                  width={524}
                  sizes="262px"
                  fill
                  className="size-full object-cover"
                />
              </div>
              <div className="flex w-full flex-col items-start gap-2 bg-surface-light p-5 leading-[1.6] text-on-surface-light">
                <p className="w-full font-mono text-body-base">{project.name}</p>
                {project.description && (
                  <p className="line-clamp-2 w-full font-sans text-[14px]">{project.description}</p>
                )}
              </div>
            </div>
          )}
          {showButton && buttonHref && (
            <ButtonLink
              label={block.button?.buttonText ?? ''}
              href={buttonHref}
              rightIcon
              className="absolute bottom-5 right-5 lg:bottom-[43px] lg:right-10"
            />
          )}
        </div>
      </div>
    </section>
  )
}
