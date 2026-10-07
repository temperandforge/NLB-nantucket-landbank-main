import type {Metadata} from 'next'
import {redirect} from 'next/navigation'

import PageView from '@/components/PageView'
import {sanityFetch} from '@/sanity/lib/live'
import {landingPageQuery} from '@/sanity/lib/queries'

/**
 * The site's landing page is whichever page is chosen in Site Settings. With none chosen, or the
 * chosen page unpublished, fall back to the map rather than serving an empty screen.
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: page} = await sanityFetch({query: landingPageQuery, stega: false})
  return {title: page?.name} satisfies Metadata
}

export default async function Page() {
  const {data: page} = await sanityFetch({query: landingPageQuery})
  if (!page?._id) redirect('/map')
  return <PageView page={page} />
}
