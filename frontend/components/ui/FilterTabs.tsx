'use client'

import {useEffect, useRef} from 'react'
import type {FilterTab} from '@/sanity/lib/archiveFilter'

const TAB =
  'cursor-pointer whitespace-nowrap text-headline-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500'

/**
 * The tab row above an archive grid (Figma: "All", then each category), as buttons with a pressed
 * state rather than page links. Shared by every archive block that filters (staff by department,
 * projects by type). Presentational, so the server can render it too: the Suspense fallback shows
 * the same row with "All" pressed, which keeps the page from shifting when the filter takes over.
 * Without `onChoose` the buttons do nothing (only until the page has loaded).
 *
 * The active tab is scrolled to the left edge, inset by the width of the edge fade (`scroll-pl-(--tf-x)`
 * matches the mask stops, which are the page padding) so the mask never dims it. A tab near the end of the row can't
 * reach the left edge: the browser stops at the end of the content.
 */
export default function FilterTabs({
  tabs,
  active,
  label,
  onChoose,
}: {
  tabs: FilterTab[]
  active: string | null
  /** Accessible name of the group, e.g. "Filter staff by department". */
  label: string
  onChoose?: (slug: string | null) => void
}) {
  const groupRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    const pressed = groupRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    // Smooth only after the first render, so a deep-linked filter doesn't animate in on load.
    pressed?.scrollIntoView({
      inline: 'start',
      block: 'nearest',
      behavior: mounted.current ? 'smooth' : 'instant',
    })
    mounted.current = true
  }, [active])
  const cls = (pressed: boolean) =>
    `${TAB} ${pressed ? 'text-on-background' : 'text-on-background-subtle'}`
  return (
    <div className="tf-px w-full">
      {/* The mask sits on the element that clips (the scroller), so the fade lands on tab text. It
          bleeds exactly into the page padding on each side (-mx-(--tf-x), so it can't overflow the viewport) and pads back in, which
          keeps the tabs aligned with the grid and lets "All" rest outside the fade. */}
      <div className="tf-max-w">
        <div
          ref={groupRef}
          role="group"
          aria-label={label}
          className="-mx-(--tf-x) flex items-center gap-10 overflow-x-auto px-(--tf-x) py-2 scroll-pl-(--tf-x) [mask-image:linear-gradient(to_right,transparent,black_var(--tf-x),black_calc(100%-var(--tf-x)),transparent)]"
        >
          <button
            type="button"
            aria-pressed={active === null}
            onClick={onChoose ? () => onChoose(null) : undefined}
            className={cls(active === null)}
          >
            All
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              type="button"
              aria-pressed={active === tab.slug}
              onClick={onChoose ? () => onChoose(tab.slug) : undefined}
              className={cls(active === tab.slug)}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
