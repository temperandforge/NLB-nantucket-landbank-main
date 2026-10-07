'use client'

import {useSearchParams} from 'next/navigation'

import type {StaffItem} from '@/components/cards/types'
import {
  departmentSearch,
  departmentTabs,
  filterByDepartment,
  parseDepartment,
} from '@/sanity/lib/staffFilter'

import StaffGrid from './StaffGrid'

const TAB =
  'cursor-pointer whitespace-nowrap text-headline-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moody-moor-500'

/**
 * The staff with department tabs (Figma: All, then each department). The chosen department lives
 * in the address as ?department=<slug>, so a filtered view can be shared. It is read with
 * useSearchParams and changed with the History API, which Next keeps in sync: no navigation and no
 * server request. The tabs are buttons with a pressed state, not page links.
 */
export default function StaffFilter({
  people,
  showFilters,
}: {
  people: StaffItem[]
  showFilters: boolean
}) {
  const searchParams = useSearchParams()
  const tabs = departmentTabs(people)

  if (!showFilters || tabs.length === 0) return <StaffGrid people={people} />

  const active = parseDepartment(`?${searchParams.toString()}`, tabs)

  function choose(slug: string | null) {
    window.history.replaceState(null, '', departmentSearch(slug) || window.location.pathname)
  }

  return (
    <div className="flex w-full flex-col items-start gap-16">
      <div
        role="group"
        aria-label="Filter staff by department"
        className="flex w-full items-center gap-10 overflow-x-auto pb-1"
      >
        <button
          type="button"
          aria-pressed={active === null}
          onClick={() => choose(null)}
          className={`${TAB} ${active === null ? 'text-on-background' : 'text-on-background-subtle'}`}
        >
          All
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            aria-pressed={active === tab.slug}
            onClick={() => choose(tab.slug)}
            className={`${TAB} ${active === tab.slug ? 'text-on-background' : 'text-on-background-subtle'}`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <StaffGrid people={filterByDepartment(people, active)} />
    </div>
  )
}
