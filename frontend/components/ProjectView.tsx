import Link from 'next/link'
import {ViewTransition} from 'react'
import type {PortableTextBlock} from 'next-sanity'

import BlockImage from '@/components/blocks/BlockImage'
import Enter from '@/components/Enter'
import JumpNavLayout from '@/components/JumpNavLayout'
import CustomPortableText from '@/components/PortableText'
import {buildJumpNav} from '@/sanity/lib/jumpNav'
import type {ProjectQueryResult, SingleProjectPageQueryResult} from '@/sanity.types'

/**
 * A project page (Figma: project_single_desktop / project_single_mobile): the title and a jump nav
 * of the body's H2s on the left; the image, the body and the FAQs on the right. Everything but the
 * name is optional and simply absent when missing.
 */
export default function ProjectView({
  project,
  settings,
  archiveHref,
}: {
  project: NonNullable<ProjectQueryResult>
  settings: SingleProjectPageQueryResult
  /** Where the eyebrow links: null renders it as plain text. */
  archiveHref: string | null
}) {
  const body = project.body ?? []
  const {items, idByKey} = buildJumpNav(body)

  const eyebrowText = settings?.eyebrow || 'Projects'
  const eyebrow = (
    <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
      {archiveHref ? (
        <Link href={archiveHref} className="no-underline hover:underline">
          {eyebrowText}
        </Link>
      ) : (
        eyebrowText
      )}
    </p>
  )

  return (
    <article className="relative w-full overflow-clip bg-background">
      <div
        className="project-curve pointer-events-none absolute left-1/2 top-[40%] h-[1089px] w-[1684px] max-w-none -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <JumpNavLayout
        variant="project"
        eyebrow={eyebrow}
        heading={project.name}
        headingLevel="h1"
        navLabel={`${project.name} sections`}
        items={items}
      >
        <div className="flex w-full flex-col gap-12 md:gap-16">
          {project.image?.asset?._ref && (
            <Enter index={0}>
              {/* The archive card's image morphs into this (CardProject `morph`). */}
              <ViewTransition name={`project-${project.slug}`} share="morph" default="none">
                <div data-morph className="relative h-[375px] w-full overflow-clip rounded bg-dusty-heath-800">
                  <BlockImage
                    image={project.image}
                    width={1280}
                    sizes="(min-width: 768px) 640px, 100vw"
                    fill
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              </ViewTransition>
            </Enter>
          )}
          {body.length > 0 && (
            <Enter>
              <CustomPortableText
                variant="project"
                className="w-full"
                value={body as PortableTextBlock[]}
                sectionIds={idByKey}
              />
            </Enter>
          )}
        </div>
      </JumpNavLayout>
    </article>
  )
}
