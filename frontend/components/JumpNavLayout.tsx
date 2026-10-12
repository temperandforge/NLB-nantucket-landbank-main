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
          ? 'relative z-10 mx-auto flex w-full max-w-[90rem] flex-col gap-12 tf-px py-12 md:flex-row md:justify-between md:gap-24 md:py-24'
          : 'max-w-[1360px] mx-auto px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-24'
      }
    >
      <div
        className={`md:sticky md:top-[calc(var(--header-height)+2.5rem)] self-start ${
          project ? 'flex w-full flex-col gap-12 md:max-w-[553px] md:flex-1' : ''
        }`}
      >
        <div className={project ? 'flex w-full max-w-[560px] flex-col gap-6' : ''}>
          {eyebrow}
          {heading && (
            <Heading
              className={project ? 'w-full text-headline-xl text-on-background' : 'text-headline-2xl mb-8'}
            >
              {heading}
            </Heading>
          )}
        </div>
        {items.length > 0 && (
          <nav className="flex flex-col" aria-label={navLabel}>
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
      <div className={project ? 'flex w-full flex-col md:w-[640px] md:shrink-0' : 'flex flex-col gap-10'}>
        {children}
      </div>
    </div>
  )
}
