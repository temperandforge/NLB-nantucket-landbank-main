import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'

import PageView from '@/components/PageView'
import {sanityFetch} from '@/sanity/lib/live'
import {landingPageQuery} from '@/sanity/lib/queries'

/**
 * The site's landing page is whichever page is chosen in Site Settings. With none chosen, or the
 * chosen page unpublished, fall back to the map rather than serving an empty screen.
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: page} = await sanityFetch({
    query: landingPageQuery,
    params: {includeHidden: false},
    stega: false,
  })
  return {title: page?.name} satisfies Metadata
}

/**
 * Revalidate hourly: an event drops off the Events Preview once it ends, which is worked out when
 * the page is fetched, so a static page would otherwise keep a past event until the next edit.
 */
export const revalidate = 3600

export default async function Page() {
  // Hidden blocks are shown (with a badge) only while an editor is previewing in Presentation.
  const {isEnabled: includeHidden} = await draftMode()
  const {data: page} = await sanityFetch({query: landingPageQuery, params: {includeHidden}})
  if (!page?._id) redirect('/map')
  return <PageView page={page} />
}
