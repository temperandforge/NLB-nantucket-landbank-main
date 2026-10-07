import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import ArticleView from '@/components/ArticleView'
import NewsPreviewView from '@/components/blocks/NewsPreviewView'
import {sanityFetch} from '@/sanity/lib/live'
import {articleQuery, articleSlugs, moreNewsQuery} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * A news article page, /news/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /news (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: articleSlugs,
    // Only published articles are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((article) => (article.slug ? [{slug: article.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/news/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: article} = await sanityFetch({query: articleQuery, params: {slug}, stega: false})
  if (!article) return {}
  const description = article.body?.length
    ? toPlainText(article.body as PortableTextBlock[]).slice(0, 160)
    : undefined
  const image = resolveOpenGraphImage(article.image)
  return {
    title: article.title,
    description,
    openGraph: image ? {images: [image]} : undefined,
  } satisfies Metadata
}

export default async function NewsArticlePage(props: PageProps<'/news/[slug]'>) {
  const {slug} = await props.params
  const [{data: article}, {data: more}] = await Promise.all([
    sanityFetch({query: articleQuery, params: {slug}}),
    sanityFetch({query: moreNewsQuery, params: {slug}}),
  ])

  // No article at this slug: a real 404, never a 200 placeholder.
  if (!article?._id) notFound()

  return (
    <>
      <ArticleView article={article} />
      {/* No call to action tile: its destination, the news archive, does not exist yet (#11). */}
      <NewsPreviewView heading="Nantucket News" articles={more} cta={null} />
    </>
  )
}
