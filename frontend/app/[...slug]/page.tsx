import type {Metadata} from 'next'
import Head from 'next/head'
import {notFound} from 'next/navigation'

import PageBuilderPage from '@/components/PageBuilder'
import {sanityFetch} from '@/sanity/lib/live'
import {getPageQuery, pagesSlugs} from '@/sanity/lib/queries'
import {GetPageQueryResult} from '@/sanity.types'

/**
 * This is a catch-all segment rather than a single [slug] because a page URL spans as many
 * segments as its parent chain is deep ("/about-us/conservation"), while grouping ancestors are
 * marked pathOnly and have no page of their own - so there is no real route hierarchy to build.
 * One catch-all owns every page path.
 *
 * More specific routes still win over this one: /posts/x matches app/posts/[slug] and /map
 * matches app/map, both of which Next.js checks before a catch-all.
 */

/** Split a derived path ("about-us/conservation") into catch-all segments. */
function toSegments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

/**
 * The query narrows on the leaf slug and then matches the full assembled path, so both are
 * needed. An empty segment list cannot match a page and is treated as not found.
 */
function toQueryParams(segments: string[]): {leaf: string; path: string} {
  return {leaf: segments[segments.length - 1] ?? '', path: segments.join('/')}
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

  return {
    title: page?.name,
    description: page?.heading,
  } satisfies Metadata
}

export default async function Page(props: PageProps<'/[...slug]'>) {
  const {slug} = await props.params
  const [{data: page}] = await Promise.all([
    sanityFetch({query: getPageQuery, params: toQueryParams(slug)}),
  ])

  // No page at this path - including a pathOnly grouping segment like /about-us, which the query
  // deliberately excludes. A real 404 rather than the starter's "no content" placeholder, which
  // was returning 200 for every unmatched URL.
  if (!page?._id) {
    notFound()
  }

  return (
    <div className="my-12 lg:my-24">
      <Head>
        <title>{page.heading}</title>
      </Head>
      <div className="">
        <div className="container">
          <div className="pb-6 border-b border-gray-100">
            <div className="max-w-3xl">
              <h1 className="text-4xl text-gray-900 sm:text-5xl lg:text-7xl">{page.heading}</h1>
              <p className="mt-4 text-base lg:text-lg leading-relaxed text-gray-600 uppercase font-light">
                {page.subheading}
              </p>
            </div>
          </div>
        </div>
      </div>
      <PageBuilderPage page={page as GetPageQueryResult} />
    </div>
  )
}
