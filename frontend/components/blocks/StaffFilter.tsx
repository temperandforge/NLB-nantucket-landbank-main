'use client'

import {useState, type CSSProperties} from 'react'

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
  // After the first choice the cards replay straight away; the block's own start delay is only for
  // the page load, where the headline goes first.
  const [chosen, setChosen] = useState(false)

  return (
    <div className="flex w-full flex-col items-start gap-16 _tf-max-w">
      <FilterTabs
        tabs={tabs}
        active={active}
        label={DEPARTMENT_FILTER_LABEL}
        onChoose={(tab) => {
          setChosen(true)
          choose(tab)
        }}
      />
      <div className="tf-px w-full" style={chosen ? ({'--enter-base': '0ms'} as CSSProperties) : undefined}>
        {/* Keyed by the category so the cards remount and play their entrance again. */}
        <StaffGrid key={active ?? 'all'} people={filterByDepartment(people, active)} />
      </div>
    </div>
  )
}
