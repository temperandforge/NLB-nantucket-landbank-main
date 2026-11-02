import Cascade from '@/components/Cascade'
import {ArrowRightIcon} from '@/components/icons'
import type {JumpNavItem} from '@/sanity/lib/jumpNav'

/**
 * The jump-nav layout: a sticky left column (eyebrow, heading, nav of the content's H2s) beside the
 * content. Shared by the Jump Nav Content block and the project page; `variant` selects the type
 * scale and nav rows each design uses, nothing else.
 */
export default function JumpNavLayout({
  variant = 'block',
  eyebrow,
  heading,
  headingLevel = 'h1',
  navLabel,
  items,
  children,
}: {
  variant?: 'block' | 'project'
  eyebrow?: React.ReactNode
  heading?: string | null
  headingLevel?: 'h1' | 'h2'
  navLabel: string
  items: JumpNavItem[]
  children: React.ReactNode
}) {
  const Heading = headingLevel
  const project = variant === 'project'

  return (
    <div
      className={
        project
          ? 'relative z-10 mx-auto flex w-full max-w-[90rem] flex-col gap-12 tf-px py-12 lg:flex-row lg:justify-between lg:gap-24 lg:py-24'
          : 'max-w-[1360px] mx-auto px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-24'
      }
    >
      <div
        // The column is capped to the visible height (viewport minus the sticky offset, top and
        // bottom breathing room) and the nav scrolls inside it, so every link stays reachable on a
        // short screen or with a long list. Title stays pinned; only the nav rows scroll.
        className={
          project
            ? 'flex w-full flex-col gap-12 self-start lg:sticky lg:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] lg:max-h-[calc(100dvh-var(--header-offset,var(--header-height))-5rem)] lg:max-w-[553px] lg:flex-1 lg:transition-[top] lg:duration-200 lg:ease-out motion-reduce:transition-none'
            : 'md:sticky md:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] md:flex md:max-h-[calc(100dvh-var(--header-offset,var(--header-height))-5rem)] md:flex-col md:transition-[top] md:duration-200 md:ease-out motion-reduce:transition-none self-start'
        }
      >
        {project ? (
          // Skipped when empty: a childless box would still add the column's gap above the nav.
          (eyebrow || heading) && (
            <div className="flex w-full max-w-[560px] shrink-0 flex-col gap-6">
              {eyebrow}
              {heading && <Cascade as={headingLevel} className="w-full text-headline-xl text-on-background" text={heading} />}
            </div>
          )
        ) : (
          <>
            {eyebrow}
            {heading && <Heading className="text-headline-2xl mb-8">{heading}</Heading>}
          </>
        )}
        {items.length > 0 && (
          <nav
            className={`flex flex-col [scrollbar-color:var(--color-border-light)_transparent] [scrollbar-width:thin] ${
              project
                ? 'lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain'
                : 'md:min-h-0 md:overflow-y-auto md:overscroll-contain'
            }`}
            aria-label={navLabel}
          >
            {items.map((item) => (
              <a
                key={item.id}
                className={
                  project
                    ? 'flex items-center justify-between gap-4 border-t border-border-light py-3 font-mono text-body-base leading-[1.6] text-on-background no-underline'
                    : 'flex items-center justify-between py-4 border-b border-dusty-heath-800 no-underline text-moody-moor-600'
                }
                href={`#${item.id}`}
              >
                <span>{item.text}</span>
                {project ? <ArrowRightIcon className="size-6 shrink-0" /> : <span aria-hidden="true">&rarr;</span>}
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className={project ? 'flex w-full flex-col lg:w-[640px] lg:shrink-0' : 'flex flex-col gap-10'}>
        {children}
      </div>
    </div>
  )
}
