import Link from 'next/link'

import {ArrowForwardIcon} from '@/components/icons'
import {projectHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import ImageCarouselTrack from './ImageCarouselTrack'
import {BlockProps} from './types'

// Collapsed and expanded sizes from the Figma carousel (368 x 460, and 416 x 520 on hover). The slide
// reserves the expanded height and widens with the card, so the gap holds and the page never shifts.
const CARD =
  'group/card relative flex h-[325px] w-full flex-none snap-start items-end justify-center overflow-clip rounded bg-dusty-heath-800 p-6 transition-[height] duration-300 ease-out md:h-[460px] hover:h-[364px] focus-visible:h-[364px] group-data-[active]/slide:h-[364px] md:hover:h-[520px] md:focus-visible:h-[520px] md:group-data-[active]/slide:h-[520px]'

export default function ImageCarousel({block}: BlockProps<'imageCarousel'>) {
  // A reference to an unpublished project dereferences to null.
  const projects = (block.projects ?? []).flatMap((project) => (project?.name ? [project] : []))
  return (
    <section className="w-full overflow-x-clip bg-background py-s6">
      <div className="flex w-full flex-col items-center gap-16">
        {block.eyebrow && (
          <div className="flex items-center justify-center rounded bg-tag px-2 py-1">
            <span className="tag-label">{block.eyebrow}</span>
          </div>
        )}
        {projects.length > 0 && (
          <ImageCarouselTrack label={block.eyebrow || 'Image carousel'}>
            {projects.map((project) => {
              // A project with no slug (unreachable through the query) is a plain card, never a dead anchor.
              const href = project.slug ? projectHref(project.slug) : null
              const content = (
                <>
                  <BlockImage
                    image={project.image?.asset?._ref ? project.image : block.defaultImage}
                    width={832}
                    sizes="(min-width: 768px) 416px, 292px"
                    fill
                    className="absolute inset-0 size-full object-cover"
                  />
                  <>
                    <span
                      className="pointer-events-none absolute inset-0 bg-hover-green opacity-0 transition-opacity duration-300 group-hover/card:opacity-85 group-focus-visible/card:opacity-85 group-data-[active]/slide:opacity-85"
                      aria-hidden="true"
                    />
                    <span className="relative flex w-full items-center gap-4 text-on-accent-secondary opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100 group-data-[active]/slide:opacity-100">
                      <span className="flex-1 font-mono text-body-small leading-[1.6] tracking-wide uppercase">
                        {project.name}
                      </span>
                      <ArrowForwardIcon className="size-6 shrink-0" />
                    </span>
                  </>
                </>
              )
              return (
                <div
                  key={project._id}
                  data-slide
                  className="group/slide flex h-[364px] w-[260px] flex-none items-center justify-center transition-[width] duration-300 ease-out has-[:focus-visible]:w-[292px] has-[:hover]:w-[292px] data-[active]:w-[292px] md:h-[520px] md:w-[368px] md:has-[:focus-visible]:w-[416px] md:has-[:hover]:w-[416px] md:data-[active]:w-[416px]"
                >
                  {href ? (
                    <Link href={href} className={CARD} aria-label={project.name}>
                      {content}
                    </Link>
                  ) : (
                    <div className={CARD} tabIndex={0}>
                      {content}
                    </div>
                  )}
                </div>
              )
            })}
          </ImageCarouselTrack>
        )}
      </div>
    </section>
  )
}
