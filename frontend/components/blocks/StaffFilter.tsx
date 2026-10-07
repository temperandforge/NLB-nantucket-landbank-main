'use client'

import {useSearchParams} from 'next/navigation'

import type {StaffItem} from '@/components/cards/types'
import {
  departmentTabs,
  filterByDepartment,
  parseDepartment,
  withDepartment,
} from '@/sanity/lib/staffFilter'

import DepartmentTabs from './DepartmentTabs'
import StaffGrid from './StaffGrid'

/**
 * The staff with department tabs. The chosen department lives in the address as
 * ?department=<slug>, so a filtered view can be shared. It is read with useSearchParams and changed
 * with the History API, which Next keeps in sync: no navigation and no server request. Only used
 * when there are tabs to show (PeopleGrid renders a plain grid otherwise).
 */
export default function StaffFilter({people}: {people: StaffItem[]}) {
  const searchParams = useSearchParams()
  const tabs = departmentTabs(people)
  const active = parseDepartment(`?${searchParams.toString()}`, tabs)

  function choose(slug: string | null) {
    // Keep any other query parameters and the hash; only the department changes.
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${withDepartment(window.location.search, slug)}${window.location.hash}`,
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-16">
      <DepartmentTabs tabs={tabs} active={active} onChoose={choose} />
      <StaffGrid people={filterByDepartment(people, active)} />
    </div>
  )
}
