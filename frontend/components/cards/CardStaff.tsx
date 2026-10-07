import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'

import type {StaffItem} from './types'

export default function CardStaff({person}: {person: StaffItem}) {
  // A department that was unpublished dereferences to null.
  const department = person.department?.title
  return (
    <div className="flex w-full max-w-[331px] flex-col items-start gap-3">
      <div className="flex w-full flex-col items-start overflow-clip rounded">
        <div className="relative aspect-[304/380] w-full shrink-0 bg-on-background-tonal">
          <BlockImage
            image={person.headshot ? {...person.headshot, alt: person.name} : null}
            width={662}
            sizes="331px"
            fill
            className="size-full object-cover"
          />
        </div>
        {department && <Tag label={department} size="lg" rounded={false} className="w-full" />}
      </div>
      <div className="flex w-full flex-col items-start break-words">
        <p className="w-full text-headline-sm leading-[1.2] tracking-normal text-on-background">{person.name}</p>
        {person.title && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            {person.title}
          </p>
        )}
      </div>
    </div>
  )
}
