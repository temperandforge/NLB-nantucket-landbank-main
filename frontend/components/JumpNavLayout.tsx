import Cascade from '@/components/Cascade'
import {ArrowRightIcon} from '@/components/icons'
import type {JumpNavItem} from '@/sanity/lib/jumpNav'

/**
 * The jump-nav layout: a sticky left column (eyebrow, heading, nav of the content's H2s) beside the
 * content. Shared by the Jump Nav Content block and the project page. The page gutter is on the
 * wrapper and the content box (`tf-max-w`) sits inside it, like every other block.
 */
export default function JumpNavLayout({
  eyebrow,
  heading,
  headingLevel = 'h1',
  navLabel,
  items,
  children,
}: {
  eyebrow?: React.ReactNode
  heading?: string | null
  headingLevel?: 'h1' | 'h2'
  navLabel: string
  items: JumpNavItem[]
  children: React.ReactNode
}) {
  return (
    <div className="tf-px w-full">
      <div className="relative z-10 tf-max-w flex flex-col gap-12 py-12 lg:flex-row lg:justify-between lg:gap-24 lg:py-24">
        <div
          // The column is capped to the visible height (viewport minus the sticky offset, top and
          // bottom breathing room) and the nav scrolls inside it, so every link stays reachable on a
          // short screen or with a long list. Title stays pinned; only the nav rows scroll.
          className="flex w-full flex-col gap-12 self-start lg:sticky lg:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] lg:max-h-[calc(100dvh-var(--header-offset,var(--header-height))-5rem)] lg:max-w-[553px] lg:flex-1 lg:transition-[top] lg:duration-200 lg:ease-out motion-reduce:transition-none"
        >
          {/* Skipped when empty: a childless box would still add the column's gap above the nav. */}
          {(eyebrow || heading) && (
            <div className="flex w-full max-w-[560px] shrink-0 flex-col gap-6">
              {eyebrow}
              {heading && (
                <Cascade
                  as={headingLevel}
                  className="w-full text-headline-xl text-on-background"
                  text={heading}
                />
              )}
            </div>
          )}
          {items.length > 0 && (
            <nav
              className="flex flex-col [scrollbar-color:var(--color-border-light)_transparent] [scrollbar-width:thin] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
              aria-label={navLabel}
            >
              {items.map((item) => (
                <a
                  key={item.id}
                  // Figma (anchor links): the arrow is faint at rest; on hover or focus the row indents
                  // 12px and takes the darker surface, and the label and arrow darken.
                  className="group flex items-center justify-between gap-4 border-t border-border-light bg-background py-3 font-mono text-body-base leading-[1.6] text-on-background no-underline transition-[padding,background-color,color] hover:bg-surface-dark hover:px-3 hover:text-on-surface-dark focus-visible:bg-surface-dark focus-visible:px-3 focus-visible:text-on-surface-dark focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-moody-moor-500"
                  href={`#${item.id}`}
                >
                  <span>{item.text}</span>
                  <ArrowRightIcon className="size-6 shrink-0 text-moody-moor-900 transition-colors group-hover:text-on-surface-dark group-focus-visible:text-on-surface-dark" />
                </a>
              ))}
            </nav>
          )}
        </div>
        <div className="flex w-full flex-col lg:w-[640px] lg:shrink-0">{children}</div>
      </div>
    </div>
  )
}
