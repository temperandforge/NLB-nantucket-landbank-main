import {Suspense} from 'react'

import CardCommissioner from '@/components/cards/CardCommissioner'

import StaffFilter from './StaffFilter'
import StaffGrid from './StaffGrid'
import {BlockProps} from './types'

export default function PeopleGrid({block}: BlockProps<'peopleGrid'>) {
  const staff = block.staff ?? []
  const commissioners = block.commissioners ?? []
  if (staff.length === 0 && commissioners.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        {staff.length > 0 && (
          // useSearchParams needs a Suspense boundary on a statically rendered page; the fallback
          // is the unfiltered grid, so the server HTML is "All" and hydration matches.
          <Suspense fallback={<StaffGrid people={staff} />}>
            <StaffFilter people={staff} showFilters={Boolean(block.showFilters)} />
          </Suspense>
        )}
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
