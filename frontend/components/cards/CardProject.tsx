import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import {realHref} from '@/sanity/lib/utils'

import type {ProjectItem} from './types'

export default function CardProject({project}: {project: ProjectItem}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = [...(project.propertyTypes ?? []), ...(project.resources ?? [])].flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const card = (
    <div className="flex w-full max-w-[322px] flex-col items-start gap-6">
      <div className="relative h-[370px] w-full overflow-hidden rounded bg-dusty-heath-800">
        <BlockImage
          image={project.image}
          width={644}
          sizes="322px"
          fill
          className="size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <p className="w-full break-words text-headline-base tracking-normal text-on-background">{project.name}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
        {project.description && (
          <p className="line-clamp-3 w-full break-words font-sans text-body-base font-normal leading-[1.6] tracking-normal text-on-background">
            {project.description}
          </p>
        )}
      </div>
    </div>
  )
  // The project's own link, when it has one; otherwise a plain card, never a dead anchor.
  const href = realHref(project.link)
  return href ? (
    <a href={href} className="block w-full max-w-[322px]">
      {card}
    </a>
  ) : (
    card
  )
}
