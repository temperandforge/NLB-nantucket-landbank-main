import type {Metadata} from 'next'
import {draftMode} from 'next/headers'
import {notFound} from 'next/navigation'

import JsonLd from '@/components/JsonLd'
import PageView from '@/components/PageView'
import {sanityFetch} from '@/sanity/lib/live'
import {currentHour} from '@/sanity/lib/dates'
import {getPageQuery, pagesSlugs} from '@/sanity/lib/queries'
import {buildMetadata} from '@/sanity/lib/seo'
import {getSeoDefaults, resolveSeoImage} from '@/sanity/lib/seoDefaults'
import {breadcrumbLd, recordsArchiveLd, webPageLd} from '@/sanity/lib/structuredData'

/**
 * This is a catch-all segment rather than a single [slug] because a page URL spans as many
 * segments as its parent chain is deep ("/about-us/conservation"), while grouping ancestors are
 * marked pathOnly and have no page of their own - so there is no real route hierarchy to build.
 * One catch-all owns every page path.
 *
 * More specific routes still win over this one: /news/<slug> matches app/news/[slug], which Next.js
 * checks before a catch-all.
 */

/** Split a derived path ("about-us/conservation") into catch-all segments. */
function toSegments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

/**
 * The query narrows on the leaf slug and then matches the full assembled path, so both are
 * needed. An empty segment list cannot match a page and is treated as not found.
 */
function toQueryParams(
  segments: string[],
  includeHidden = false,
): {leaf: string; path: string; includeHidden: boolean; now: string} {
  return {
    leaf: segments[segments.length - 1] ?? '',
    path: segments.join('/'),
    includeHidden,
    now: currentHour(),
  }
}

/**
 * Generate the static params for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: pagesSlugs,
    // // Use the published perspective in generateStaticParams
    perspective: 'published',
    stega: false,
  })
  return data
    .filter((page): page is {slug: string} => Boolean(page.slug))
    .map((page) => ({slug: toSegments(page.slug)}))
}

export const dynamicParams = true

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(props: PageProps<'/[...slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: page} = await sanityFetch({
    query: getPageQuery,
    params: toQueryParams(slug),
    // Metadata should never contain stega
    stega: false,
  })

  if (!page) return {}
  return buildMetadata({
    seo: page.seo,
    title: page.name,
    image: resolveSeoImage(page.seo),
    // The landing page's canonical is /, not the path it is also reachable at.
    path: page.isLanding ? '/' : `/${page.path}`,
    defaults: await getSeoDefaults(),
  })
}

/**
 * Revalidate hourly: an event drops off the Events Preview once it ends, which is worked out when
 * the page is fetched, so a static page would otherwise keep a past event until the next edit.
 */
export const revalidate = 3600

export default async function Page(props: PageProps<'/[...slug]'>) {
  const {slug} = await props.params
  // Hidden blocks are shown (with a badge) only while an editor is previewing in Presentation.
  const {isEnabled: includeHidden} = await draftMode()
  const [{data: page}] = await Promise.all([
    sanityFetch({query: getPageQuery, params: toQueryParams(slug, includeHidden)}),
  ])

  // No page at this path - including a pathOnly grouping segment like /about-us, which the query
  // deliberately excludes. A real 404 rather than the starter's "no content" placeholder, which
  // was returning 200 for every unmatched URL.
  if (!page?._id) {
    notFound()
  }

  const defaults = await getSeoDefaults()
  const path = page.isLanding ? '/' : `/${page.path}`
  // A grouping (pathOnly) ancestor has a name in the trail but no page to link to.
  const crumbs = [
    {name: defaults.siteName, path: '/'},
    ...(page.ancestors ?? []).flatMap((ancestor) =>
      ancestor ? [{name: ancestor.name, path: ancestor.pathOnly ? null : `/${ancestor.path}`}] : [],
    ),
    {name: page.name, path},
  ]
  const archives = (page.pageBuilder ?? []).flatMap((block) => (block._type === 'recordsArchive' ? [block] : []))

  return (
    <>
      <JsonLd
        data={[
          webPageLd({name: page.name, description: page.seo?.description || defaults.description, path}, defaults.origin),
          breadcrumbLd(crumbs, defaults.origin),
          ...archives.map((archive) =>
            recordsArchiveLd({name: page.name, path, records: archive.records ?? []}, defaults.origin),
          ),
        ]}
      />
      <PageView page={page} />
    </>
  )
}
