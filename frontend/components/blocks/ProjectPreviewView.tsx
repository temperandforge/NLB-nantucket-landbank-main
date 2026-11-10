import type {ComponentProps} from 'react'

import AnchorLink from '@/components/ui/AnchorLink'
import {ArrowRightIcon} from '@/components/icons'
import ButtonLink from '@/components/ui/ButtonLink'
import {projectHref, singleHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'

export type PreviewProject = {
  _id: string
  name?: string | null
  slug?: string | null
  externalUrl?: string | null
  image?: ComponentProps<typeof BlockImage>['image']
}

// Columns follow the project count from md up, so fewer than three cards widen to fill the row
// instead of leaving empty columns. A lone card would be very tall at the portrait ratio, so it
// uses a landscape one and a pair a square one. The image box is also capped in height (it crops,
// never stretches) so wide screens don't make the row towering. Literal class names so Tailwind sees them.
const COLUMNS = ['md:grid-cols-3', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3'] as const
const IMAGE_RATIO = ['aspect-[346/467]', 'aspect-[3/2]', 'aspect-square', 'aspect-[346/467]'] as const

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
      <div className="flex w-full flex-col gap-16 tf-max-w xl:flex-row xl:gap-6">
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
          <ol className={`m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-20 p-0 ${COLUMNS[Math.min(shown.length, 3)]} md:gap-x-6 md:gap-y-6`}>
            {shown.map((project, index) => {
                            const href = singleHref(project.externalUrl, project.slug, projectHref)
              // `group` drives the hover and focus states below. Tailwind only applies hover where the
              // device can hover, so a tap never leaves a card stuck in its hover state.
              const cardClass =
                'group flex min-w-0 flex-col items-start gap-5 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current'
              const card = (
                <>
                  <div className="flex w-full flex-col items-start gap-12 text-on-background md:gap-16 xl:gap-32">
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-headline-xl whitespace-nowrap">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {/* Slides in beside the number; decorative, the whole card is the link. Under
                          reduced motion it appears without the slide. */}
                      {href && (
                        <ArrowRightIcon className="size-6 shrink-0 -translate-x-2 opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none" />
                      )}
                    </div>
                    <p className="w-full font-mono text-body-base leading-[1.6] text-pretty underline decoration-transparent decoration-1 underline-offset-4 transition-[text-decoration-color] duration-300 group-hover:decoration-current group-focus-visible:decoration-current motion-reduce:transition-none">
                      {project.name}
                    </p>
                  </div>
                  <div className={`relative ${IMAGE_RATIO[Math.min(shown.length, 3)]} w-full max-h-[40rem] overflow-clip bg-dusty-heath-800`}>
                    <BlockImage
                      image={project.image}
                      width={692}
                      sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw"
                      fill
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
                    />
                  </div>
                </>
              )
              return (
                <li
                  key={project._id}
                  className={`relative min-w-0 md:row-span-2 md:grid md:grid-rows-subgrid ${
                    index > 0
                      ? // Stacked (below md) the divider is a horizontal rule centred in the gap above the
                        // card; from md the cards sit in columns and it is a vertical rule beside it.
                        'before:absolute before:inset-x-0 before:-top-10 before:h-px before:bg-border-light md:before:inset-x-auto md:before:inset-y-0 md:before:-left-3 md:before:h-auto md:before:w-px'
                      : ''
                  }`}
                >
                  {href ? (
                    <AnchorLink href={href} className={cardClass}>
                      {card}
                    </AnchorLink>
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
