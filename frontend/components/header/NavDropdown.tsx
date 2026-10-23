import type {KeyboardEvent} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ArrowRightIcon} from '@/components/icons'
import {groupMenuLinks} from '@/sanity/lib/menuGroups'
import type {HeaderMenuChild} from '@/sanity/lib/types'

/** Tracked uppercase label - Figma type style mono/tracked. */
const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

/** ArrowDown/ArrowUp move focus between the panel's links, wrapping at the ends. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'))
  if (links.length === 0) return
  event.preventDefault()
  const current = links.indexOf(document.activeElement as HTMLAnchorElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  const next = current === -1 ? (step === 1 ? 0 : links.length - 1) : (current + step + links.length) % links.length
  links[next].focus()
}

/**
 * The panel under a top-level item. A headed panel spans the viewport (the same full-bleed trick as
 * the mobile panel) with its columns on the page gutter, in line with the logo, as in Figma. A flat panel is offset -left-8 (its 40px padding less the trigger's 8px
 * inset) so its text lines up with the trigger's label, as in Figma. Links with a column heading render as headed columns, each
 * with a left rule; a menu with no headings renders as one flat list. Items whose link cannot
 * be resolved are dropped.
 */
export default function NavDropdown({
  id,
  labelledBy,
  items,
  grouped,
  onNavigate,
}: {
  id: string
  labelledBy: string
  /** Resolvable links only (the owner filters), so `grouped` and this list agree. */
  items: HeaderMenuChild[]
  /** Whether any link has a column heading; the owner computes it once for the <li> and the panel. */
  grouped: boolean
  /** Called when a link inside the panel is activated, so the owner can close it. */
  onNavigate?: () => void
}) {
  if (items.length === 0) return null
  const columns = groupMenuLinks(items)

  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      onKeyDown={moveFocus}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) onNavigate?.()
      }}
      className={`absolute top-full z-40 bg-background shadow-[0_20px_80px_rgba(47,42,34,0.16)] ${
        grouped
          ? 'left-1/2 w-screen -translate-x-1/2 tf-px py-10'
          : '-left-8 w-max min-w-64 rounded-b p-10'
      }`}
    >
      <div className={grouped ? 'grid grid-cols-3 gap-x-gap-lg' : ''}>
        {columns.map((column, index) => (
          <div key={`${column.heading ?? 'none'}-${index}`} className="flex flex-col">
            {column.heading && <h3 className={LABEL_CLASS}>{column.heading}</h3>}
            <ul className={`flex flex-col ${column.heading ? 'border-l border-border-light pl-gap-md' : ''}`}>
              {column.links.map((item) => (
                <li key={item._key}>
                  <ResolvedLink
                    link={item.link}
                    className="group flex h-14 w-fit items-center gap-gap-sm border-b border-transparent font-secondary text-body-base text-on-primary hover:border-border-alt focus-visible:border-border-alt"
                  >
                    {item.label}
                    <ArrowRightIcon className="hidden size-6 text-secondary group-hover:block group-focus-visible:block" />
                  </ResolvedLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
