import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import EventsPreviewView from '@/components/blocks/EventsPreviewView'
import EventView from '@/components/EventView'
import PageTransition from '@/components/PageTransition'
import {currentHour} from '@/sanity/lib/dates'
import {sanityFetch} from '@/sanity/lib/live'
import {eventQuery, eventSlugs, moreEventsQuery} from '@/sanity/lib/queries'

/**
 * An event page, /events/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /events (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: eventSlugs,
    // Only published events are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((event) => (event.slug ? [{slug: event.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/events/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: event} = await sanityFetch({query: eventQuery, params: {slug}, stega: false})
  if (!event) return {}
  return {title: event.title, description: event.description || undefined} satisfies Metadata
}

export default async function EventPage(props: PageProps<'/events/[slug]'>) {
  const {slug} = await props.params
  const [{data: event}, {data: others}] = await Promise.all([
    sanityFetch({query: eventQuery, params: {slug}}),
    sanityFetch({query: moreEventsQuery, params: {slug, now: currentHour()}}),
  ])

  // No event at this slug: a real 404, never a 200 placeholder.
  if (!event?._id) notFound()

  return (
    <PageTransition>
      <EventView event={event} />
      {others.length > 0 && <EventsPreviewView eyebrow="Events - Upcoming" events={others.slice(0, 2)} />}
    </PageTransition>
  )
}
