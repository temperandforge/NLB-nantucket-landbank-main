import {Suspense} from 'react'

import CardCommissioner from '@/components/cards/CardCommissioner'

import {departmentTabs} from '@/sanity/lib/staffFilter'

import DepartmentTabs from './DepartmentTabs'
import StaffFilter from './StaffFilter'
import StaffGrid from './StaffGrid'
import {BlockProps} from './types'

export default function PeopleGrid({block}: BlockProps<'peopleGrid'>) {
  const staff = block.staff ?? []
  const commissioners = block.commissioners ?? []
  if (staff.length === 0 && commissioners.length === 0) return null
  const tabs = departmentTabs(staff)
  const showTabs = Boolean(block.showFilters) && tabs.length > 0

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        {staff.length > 0 &&
          (showTabs ? (
            // useSearchParams needs a Suspense boundary on a statically rendered page. The fallback
            // is the same tabs and grid with "All" pressed, so the page does not shift when the
            // filter takes over, and the server HTML is "All".
            <Suspense
              fallback={
                <div className="flex w-full flex-col items-start gap-16">
                  <DepartmentTabs tabs={tabs} active={null} />
                  <StaffGrid people={staff} />
                </div>
              }
            >
              <StaffFilter people={staff} />
            </Suspense>
          ) : (
            <StaffGrid people={staff} />
          ))}
        {commissioners.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-16 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {commissioners.map((person) => (
              <li key={person._id}>
                <CardCommissioner person={person} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
