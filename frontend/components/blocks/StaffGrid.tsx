import CardStaff from '@/components/cards/CardStaff'
import type {StaffItem} from '@/components/cards/types'

/** The staff, 4 columns at lg. Figma: 12px between columns, 64px between rows. */
export default function StaffGrid({people}: {people: StaffItem[]}) {
  return (
    <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-16 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {people.map((person) => (
        <li key={person._id}>
          <CardStaff person={person} />
        </li>
      ))}
    </ul>
  )
}
