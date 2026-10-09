import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import {realHref} from '@/sanity/lib/utils'

import type {ProjectItem} from './types'

/** A project (Figma: image with its property types as tags over the bottom-left, name below). */
export default function CardProject({project}: {project: ProjectItem}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = (project.propertyTypes ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const card = (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="relative flex h-[375px] w-full flex-col items-start justify-end overflow-hidden rounded bg-dusty-heath-800 p-6">
        <BlockImage
          image={project.image}
          width={1000}
          sizes="(min-width: 1024px) 50vw, 100vw"
          fill
          className="absolute inset-0 size-full object-cover"
        />
        {tags.length > 0 && (
          <div className="relative flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
      </div>
      <p className="w-full break-words text-headline-sm leading-[1.2] tracking-normal text-on-background">{project.name}</p>
    </div>
  )
  // The project's own link, when it has one; otherwise a plain card, never a dead anchor.
  const href = realHref(project.link)
  return href ? (
    <a href={href} className="block w-full">
      {card}
    </a>
  ) : (
    card
  )
}
