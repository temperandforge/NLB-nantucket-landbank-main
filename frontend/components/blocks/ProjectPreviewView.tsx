import type {ComponentProps} from 'react'

import ButtonLink from '@/components/ui/ButtonLink'
import {projectHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'

export type PreviewProject = {
  _id: string
  name?: string | null
  slug?: string | null
  image?: ComponentProps<typeof BlockImage>['image']
}

/**
 * The Project Preview markup (Figma: Project Preview): an intro panel with text and a button, then
 * each project as a numbered column. Used by the Project Preview block and by the project page's
 * "more projects" section.
 */
export default function ProjectPreviewView({
  eyebrow,
  body,
  button,
  projects,
}: {
  eyebrow?: string | null
  body?: string | null
  button?: {label: string; href: string} | null
  projects: PreviewProject[]
}) {
  // A reference to an unpublished project dereferences to null.
  const shown = projects.filter((project) => project?.name)
  const hasPanel = Boolean(eyebrow || body || button)
  if (!hasPanel && shown.length === 0) return null

  return (
    <section className="w-full bg-background tf-px py-s5">
      {/* Below 1280px the numbered cards drop to their own row under the panel; below 768px they
          stack in one column. */}
      <div className="flex w-full flex-col gap-6 tf-max-w xl:flex-row">
        {hasPanel && (
          // Figma's 644px is just what the row measures at 1440. The cards grow and shrink with the
          // width, so the panel takes the row's height (a flex row stretches its children) and always
          // matches them.
          <div className="flex min-h-[28rem] flex-col items-start justify-between gap-10 bg-surface-dark p-6 text-on-surface-dark md:min-h-0 md:gap-16 xl:w-[425px] xl:shrink-0 xl:gap-10">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {body && <p className="w-full font-sans text-body-base leading-[1.6]">{body}</p>}
            {button && <ButtonLink label={button.label} href={button.href} rightIcon />}
          </div>
        )}
        {shown.length > 0 && (
          // Three equal columns on one grid, so every card is the same width (and so the same image
          // size) and the two rows, header and image, line up across the cards however many lines a
          // name wraps to. The divider is drawn in the gap, not inside a column, for the same reason.
          <ol className="m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-10 p-0 md:grid-cols-3 md:gap-x-6 md:gap-y-6">
            {shown.map((project, index) => {
              const href = project.slug ? projectHref(project.slug) : null
              const cardClass =
                'flex min-w-0 flex-col items-start gap-6 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-6'
              const card = (
                <>
                  <div className="flex w-full flex-col items-start gap-8 text-on-background md:gap-16 xl:gap-32">
                    <span className="text-headline-xl whitespace-nowrap">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="w-full font-mono text-body-base leading-[1.6]">{project.name}</p>
                  </div>
                  <div className="relative aspect-[346/467] w-full overflow-clip bg-dusty-heath-800">
                    <BlockImage
                      image={project.image}
                      width={692}
                      sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 100vw"
                      fill
                      className="size-full object-cover"
                    />
                  </div>
                </>
              )
              return (
                <li
                  key={project._id}
                  className={`relative min-w-0 md:row-span-2 md:grid md:grid-rows-subgrid ${
                    index > 0
                      ? 'md:before:absolute md:before:inset-y-0 md:before:-left-3 md:before:w-px md:before:bg-border-light'
                      : ''
                  }`}
                >
                  {href ? (
                    <a href={href} className={cardClass}>
                      {card}
                    </a>
                  ) : (
                    <div className={cardClass}>{card}</div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
