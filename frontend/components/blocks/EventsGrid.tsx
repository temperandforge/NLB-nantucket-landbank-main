import Link from 'next/link'

import BlockImage from '@/components/blocks/BlockImage'
import {ArrowRightIcon, ClockIcon, MapPinIcon} from '@/components/icons'
import {eventParts} from '@/sanity/lib/dates'

import {BlockProps} from './types'

/**
 * The upcoming events as rows (Figma: events_desktop / events_mobile). An event with no slug has
 * no page, so it is not a link; one with no image still renders (the date badge needs a start, so
 * an event without one is skipped entirely).
 *
 * The whole row is clickable through a stretched link: the title is the only link (so its accessible
 * name is the event title, not a repeated "View details"), and its ::after covers the row. "View
 * details" is a visual cue only, hidden from assistive tech. The focus ring is drawn on that same
 * ::after, so it surrounds the whole row.
 */
export default function EventsGrid({block}: BlockProps<'eventsGrid'>) {
  const events = (block.events ?? []).flatMap((event) => {
    const parts = eventParts(event.start, event.end)
    return parts ? [{event, parts}] : []
  })

  return (
    <section className="relative bg-background tf-px py-s4">
      {events.length === 0 ? (
        <p className="mx-auto w-full tf-max-w font-sans text-body-base leading-[1.6] text-on-background-subtle">
          {block.emptyText || 'No upcoming events right now.'}
        </p>
      ) : (
        <ul className="mx-auto flex w-full list-none flex-col p-0 tf-max-w">
          {events.map(({event, parts}) => {
            const href = event.slug ? `/events/${event.slug}` : null
            return (
              <li
                key={event._id}
                className="group relative flex flex-col gap-6 border-t border-border-light py-10 first:border-t-0 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between md:gap-0"
              >
                <div className="flex flex-col gap-8 md:flex-row md:gap-16">
                  <div className="relative h-[288px] w-full shrink-0 overflow-clip rounded bg-surface-dark md:w-[380px]">
                    <BlockImage
                      image={event.image}
                      width={760}
                      sizes="(min-width: 768px) 380px, 100vw"
                      fill
                      className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute left-3 top-3 flex flex-col items-center justify-center gap-1 rounded bg-surface-light px-5 py-3 text-center text-on-surface-light md:px-6">
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.weekday}</p>
                      <p className="text-headline-lg leading-[1.1]">{parts.day}</p>
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.month}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-3 md:max-w-[668px]">
                    <p className="w-full text-headline-base leading-[1.1] text-on-background">
                      {href ? (
                        <Link href={href} className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-8 group-hover:underline">
                          {event.title}
                        </Link>
                      ) : (
                        event.title
                      )}
                    </p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                      <div className="flex items-center gap-3">
                        <ClockIcon className="size-[22px] shrink-0" />
                        <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                          {parts.time}
                        </p>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="size-[22px] shrink-0" />
                          <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                            {event.location}
                          </p>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="w-full font-sans text-body-base leading-[1.6] text-on-background">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
                {href && (
                  <span aria-hidden="true" className="link-button md:shrink-0 group-hover:[&_svg]:text-secondary">
                    <span>View details</span>
                    <ArrowRightIcon className="link-button-icon" />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
