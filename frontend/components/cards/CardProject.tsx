import {ViewTransition} from 'react'

import BlockImage from '@/components/blocks/BlockImage'
import AnchorLink from '@/components/ui/AnchorLink'
import Tag from '@/components/ui/Tag'
import {projectHref} from '@/sanity/lib/utils'

import type {ProjectItem} from './types'

/**
 * A project (Figma: image with its project types as tags over the bottom-left, name below).
 *
 * `morph` names the image so it morphs into the project page's image (ProjectView). Only the
 * archive grid passes it; a preview grid on the destination page must not, or its card would claim
 * the same name and fade out in place instead.
 */
export default function CardProject({project, morph = false}: {project: ProjectItem; morph?: boolean}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = (project.projectTypes ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const imageBox = (
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
  )
  const card = (
    <div className="flex w-full flex-col items-start gap-6">
      {/* Named only when the project page renders an image to pair with (ProjectView). */}
      {morph && project.slug && project.image?.asset?._ref ? (
        <ViewTransition name={`project-${project.slug}`} share="morph" default="none">
          {imageBox}
        </ViewTransition>
      ) : (
        imageBox
      )}
      <p className="w-full break-words text-headline-sm leading-[1.2] tracking-normal text-on-background">{project.name}</p>
    </div>
  )
  // Every project has a page of its own; a project with no slug (unreachable through the query,
  // which requires one) would be a plain card, never a dead anchor.
  const href = project.slug ? projectHref(project.slug) : null
  return href ? (
    <AnchorLink href={href} className="block w-full">
      {card}
    </AnchorLink>
  ) : (
    card
  )
}
