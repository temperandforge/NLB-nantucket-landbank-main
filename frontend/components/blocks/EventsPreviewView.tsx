import Link from 'next/link'

import {ClockIcon, MapPinIcon} from '@/components/icons'
import ButtonLink from '@/components/ui/ButtonLink'
import {eventParts} from '@/sanity/lib/dates'
import {eventHref, singleHref} from '@/sanity/lib/utils'

import Eyebrow from './Eyebrow'

export type EventTile = {
  _id: string
  title: string | null
  slug?: string | null
  externalUrl?: string | null
  start: string | null
  end: string | null
  location: string | null
  description: string | null
}

/** The upcoming-events strip, shared by the Events Preview block and the event page. */
export default function EventsPreviewView({
  eyebrow,
  events: tiles,
  button,
  hideWhenEmpty = false,
}: {
  eyebrow?: string | null
  events: EventTile[]
  button?: {label: string; href: string} | null
  /** Render nothing, rather than a "no events" message, when there is nothing to list. */
  hideWhenEmpty?: boolean
}) {
  const events = tiles.flatMap((event) => {
      const parts = eventParts(event.start, event.end)
      return parts ? [{event, parts, href: singleHref(event.externalUrl, event.slug, eventHref)}] : []
    })

  if (hideWhenEmpty && events.length === 0) return null
  const showButton = Boolean(button) && events.length > 0

  return (
    <div className="relative bg-background tf-px py-s4">
      <div className="flex w-full flex-col items-start gap-s4 tf-max-w">
        {(eyebrow || showButton) && (
          <div className={`${eyebrow ? 'flex' : 'hidden md:flex'} w-full items-center justify-between gap-8`}>
            {eyebrow && <Eyebrow className="text-on-background">{eyebrow}</Eyebrow>}
            {/* Beside the eyebrow from md up; below the grid on mobile (see the copy at the end). */}
            {showButton && button && (
              <div className="ml-auto hidden shrink-0 md:block">
                <ButtonLink label={button.label} href={button.href} rightIcon />
              </div>
            )}
          </div>
        )}
        {events.length === 0 ? (
          <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
            No upcoming events right now.
          </p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-y-12 lg:grid-cols-2 lg:gap-x-20 lg:gap-y-16">
            {events.map(({event, parts, href}) => (
              <div
                key={event._id}
                className="group relative flex min-w-0 items-start gap-8 lg:gap-10"
              >
                <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded bg-surface-dark px-4 py-3 text-center text-on-surface-dark md:gap-3 md:px-8 md:py-6">
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.weekday}</p>
                  <p className="text-headline-xl leading-[1.1]">{parts.day}</p>
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.month}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:gap-6">
                  <p className="w-full text-headline-base leading-[1.1] text-on-background">
                    {href ? (
                      <Link href={href} className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-8 group-hover:underline text-pretty">
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
                    <p className="line-clamp-3 w-full md:line-clamp-5 font-sans text-body-base leading-[1.6] text-on-background-subtle">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {showButton && button && (
          <div className="md:hidden">
            <ButtonLink label={button.label} href={button.href} rightIcon />
          </div>
        )}
      </div>
    </div>
  )
}
