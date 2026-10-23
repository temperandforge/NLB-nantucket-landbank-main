import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {notFound} from 'next/navigation'

import JsonLd from '@/components/JsonLd'
import PageView from '@/components/PageView'
import {sanityFetch} from '@/sanity/lib/live'
import {currentHour} from '@/sanity/lib/dates'
import {landingPageQuery} from '@/sanity/lib/queries'
import {buildMetadata} from '@/sanity/lib/seo'
import {getSeoDefaults, resolveSeoImage} from '@/sanity/lib/seoDefaults'
import {webPageLd} from '@/sanity/lib/structuredData'

/**
 * The site's landing page is whichever page is chosen in Site Settings. With none chosen, or the
 * chosen page unpublished, fall back to the map rather than serving an empty screen.
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: page} = await sanityFetch({
    query: landingPageQuery,
    params: {includeHidden: false, now: currentHour()},
    stega: false,
  })
  if (!page) return {}
  return buildMetadata({
    seo: page.seo,
    title: page.name,
    image: resolveSeoImage(page.seo),
    path: '/',
    defaults: await getSeoDefaults(),
  })
}

/**
 * Revalidate hourly: an event drops off the Events Preview once it ends, which is worked out when
 * the page is fetched, so a static page would otherwise keep a past event until the next edit.
 */
export const revalidate = 3600

export default async function Page() {
  // Hidden blocks are shown (with a badge) only while an editor is previewing in Presentation.
  const {isEnabled: includeHidden} = await draftMode()
  const {data: page} = await sanityFetch({query: landingPageQuery, params: {includeHidden, now: currentHour()}})
  if (!page?._id) notFound()
  const defaults = await getSeoDefaults()
  return (
    <>
      <JsonLd
        data={webPageLd(
          {name: page.name, description: page.seo?.description || defaults.description, path: '/'},
          defaults.origin,
        )}
      />
      <PageView page={page} />
    </>
  )
}
