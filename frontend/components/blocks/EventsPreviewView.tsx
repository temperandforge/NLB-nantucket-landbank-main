import Link from 'next/link'

import {ClockIcon, MapPinIcon} from '@/components/icons'
import {eventParts} from '@/sanity/lib/dates'

import Eyebrow from './Eyebrow'

export type EventTile = {
  _id: string
  title: string | null
  slug?: string | null
  start: string | null
  end: string | null
  location: string | null
  description: string | null
}

/** The upcoming-events strip, shared by the Events Preview block and the event page. */
export default function EventsPreviewView({
  eyebrow,
  events: tiles,
}: {
  eyebrow?: string | null
  events: EventTile[]
}) {
  const events = tiles.flatMap((event) => {
      const parts = eventParts(event.start, event.end)
      return parts ? [{event, parts}] : []
    })

  return (
    <div className="relative bg-background tf-px py-s4">
      <div className="flex w-full flex-col items-start gap-s4 tf-max-w">
        {eyebrow && <Eyebrow className="w-full text-on-background">{eyebrow}</Eyebrow>}
        {events.length === 0 ? (
          <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
            No upcoming events right now.
          </p>
        ) : (
          <div className="flex w-full flex-col divide-y divide-border-light lg:flex-row lg:items-stretch lg:divide-x lg:divide-y-0">
            {events.map(({event, parts}) => (
              <div
                key={event._id}
                className="group relative flex gap-8 py-12 first:pt-0 last:pb-0 lg:flex-1 lg:gap-10 lg:px-10 lg:py-0 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex size-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded bg-surface-dark p-3 text-center text-on-surface-dark md:size-[200px] md:gap-3">
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.weekday}</p>
                  <p className="text-headline-xl leading-[1.1]">{parts.day}</p>
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.month}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:gap-6">
                  <p className="w-full text-headline-base leading-[1.1] text-on-background">
                    {event.slug ? (
                      <Link href={`/events/${event.slug}`} className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-8 group-hover:underline">
                        {event.title}
                      </Link>
                    ) : (
                      event.title
                    )}
                  </p>
                  <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="size-6 shrink-0" />
                      <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                        {parts.time}
                      </p>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-3">
                        <MapPinIcon className="size-6 shrink-0" />
                        <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                          {event.location}
                        </p>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="w-full font-sans text-body-base leading-[1.6] text-on-background-subtle">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
