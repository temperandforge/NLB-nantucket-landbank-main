'use client'

import type {StaffItem} from '@/components/cards/types'
import FilterTabs from '@/components/ui/FilterTabs'
import {
  DEPARTMENT_FILTER_LABEL,
  DEPARTMENT_PARAM,
  departmentTabs,
  filterByDepartment,
} from '@/sanity/lib/archiveFilter'

import StaffGrid from './StaffGrid'
import {useQueryFilter} from './useQueryFilter'

/** The staff with department tabs. Only used when there are tabs to show (PeopleGrid renders a plain grid otherwise). */
export default function StaffFilter({people}: {people: StaffItem[]}) {
  const tabs = departmentTabs(people)
  const {active, choose} = useQueryFilter(DEPARTMENT_PARAM, tabs)

  return (
    <div className="flex w-full flex-col items-start gap-16 _tf-max-w">
      <FilterTabs tabs={tabs} active={active} label={DEPARTMENT_FILTER_LABEL} onChoose={choose} />
      <div className="tf-px mx-auto w-full">
        <StaffGrid people={filterByDepartment(people, active)} />
      </div>
    </div>
  )
}
