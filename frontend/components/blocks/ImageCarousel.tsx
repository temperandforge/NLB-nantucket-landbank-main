import {projectHref} from '@/sanity/lib/utils'

import ImageCarouselSlide from './ImageCarouselSlide'
import ImageCarouselTrack from './ImageCarouselTrack'
import {BlockProps} from './types'

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
            {projects.map((project) => (
              <ImageCarouselSlide
                key={project._id}
                image={project.image?.asset?._ref ? project.image : block.defaultImage}
                label={project.name}
                // A project with no slug (unreachable through the query) is a plain card, never a dead anchor.
                href={project.slug ? projectHref(project.slug) : null}
              />
            ))}
          </ImageCarouselTrack>
        )}
      </div>
    </section>
  )
}
