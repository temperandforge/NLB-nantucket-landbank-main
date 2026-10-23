import type {PortableTextBlock} from 'next-sanity'

import Cascade from '@/components/Cascade'
import {CalendarIcon, ClockIcon, MapPinIcon} from '@/components/icons'
import CustomPortableText from '@/components/PortableText'
import {eventDateLabel, eventParts} from '@/sanity/lib/dates'
import type {EventQueryResult} from '@/sanity.types'

/**
 * An event page (Figma: events_content_desktop / events_content_mobile): the title, date, time and
 * place on the left; the page content (sections and images) on the right. Everything but the title
 * is optional and simply absent when missing.
 */
export default function EventView({event}: {event: NonNullable<EventQueryResult>}) {
  const parts = eventParts(event.start, event.end)
  const date = eventDateLabel(event.start)
  const body = event.body ?? []

  const rows = [
    date && {key: 'date', Icon: CalendarIcon, text: date},
    parts && {key: 'time', Icon: ClockIcon, text: parts.time},
    event.location && {key: 'location', Icon: MapPinIcon, text: event.location},
  ].filter((row): row is {key: string; Icon: typeof ClockIcon; text: string} => Boolean(row))

  return (
    <article className="relative w-full overflow-clip bg-background">
      <div
        className="project-curve pointer-events-none absolute left-1/2 top-[40%] h-[1089px] w-[1684px] max-w-none -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-col gap-12 tf-px py-12 lg:flex-row lg:justify-between lg:gap-24 lg:py-24">
        {/* Pinned on desktop below the header, whose offset follows its hide/show state (as on the project page). */}
        <div className="flex w-full flex-col gap-8 self-start lg:sticky lg:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] lg:max-w-[414px] lg:flex-1 lg:gap-12 lg:transition-[top] lg:duration-200 lg:ease-out motion-reduce:transition-none">
          <div className="flex w-full max-w-[560px] flex-col gap-6">
            <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase load-in">
              Events
            </p>
            <Cascade as="h1" className="w-full text-headline-xl text-on-background" text={event.title} />
          </div>
          {rows.length > 0 && (
            <ul className="flex flex-col gap-5 lg:gap-6 load-in" style={{'--load-in-step': 1} as React.CSSProperties}>
              {rows.map(({key, Icon, text}) => (
                <li key={key} className="flex items-center gap-3">
                  <Icon className="size-[22px] shrink-0" />
                  <span className="font-sans text-body-base leading-[1.6] text-on-background-subtle">{text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {body.length > 0 && (
          <div className="flex w-full flex-col lg:w-[640px] lg:shrink-0">
            <CustomPortableText variant="project" className="w-full" value={body as PortableTextBlock[]} />
          </div>
        )}
      </div>
    </article>
  )
}
