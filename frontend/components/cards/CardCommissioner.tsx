import BlockImage from '@/components/blocks/BlockImage'
import {formatMonthYear} from '@/sanity/lib/dates'

import type {CommissionerItem} from './types'

export default function CardCommissioner({person}: {person: CommissionerItem}) {
  const since = formatMonthYear(person.startDate)
  return (
    <div className="flex w-full max-w-[448px] flex-col items-start gap-3">
      <div className="relative aspect-[448/556] w-full shrink-0 overflow-clip rounded bg-on-background-tonal">
        <BlockImage
          image={person.headshot ? {...person.headshot, alt: person.name} : null}
          width={896}
          sizes="448px"
          fill
          className="size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start break-words">
        <p className="w-full text-headline-sm leading-[1.2] tracking-normal text-on-background">{person.name}</p>
        {person.title && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            {person.title}
          </p>
        )}
        {since && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            Since {since}
          </p>
        )}
      </div>
    </div>
  )
}
