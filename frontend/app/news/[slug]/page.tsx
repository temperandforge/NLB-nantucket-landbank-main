import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import ArticleView from '@/components/ArticleView'
import NewsPreviewView from '@/components/blocks/NewsPreviewView'
import {sanityFetch} from '@/sanity/lib/live'
import {
  articleQuery,
  articleSlugs,
  moreNewsQuery,
  singleNewsPageQuery,
} from '@/sanity/lib/queries'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref, resolveOpenGraphImage} from '@/sanity/lib/utils'

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
  const [{data: article}, {data: settings}] = await Promise.all([
    sanityFetch({query: articleQuery, params: {slug}}),
    sanityFetch({query: singleNewsPageQuery}),
  ])

  // No article at this slug: a real 404, never a 200 placeholder.
  if (!article?._id) notFound()

  // Related articles need this article's categories, so they are fetched once it is known.
  const moreSettings = settings?.moreNews
  const showMore = !moreSettings?.disabled
  const {data: more} = showMore
    ? await sanityFetch({
        query: moreNewsQuery,
        params: {slug, categoryIds: article.categoryIds ?? []},
      })
    : {data: []}
  const count = Math.min(Math.max(moreSettings?.count ?? 3, 1), 12)
  const ctaHref = realHref(
    moreSettings?.ctaLink ? linkResolver(moreSettings.ctaLink as DereferencedLink) : null,
  )

  return (
    <>
      <ArticleView
        article={article}
        eyebrow={settings?.eyebrow || undefined}
        publishedLabel={settings?.publishedLabel || undefined}
        shareLabel={settings?.shareLabel || undefined}
      />
      {showMore && (
        <NewsPreviewView
          heading={moreSettings ? moreSettings.heading : 'Nantucket News'}
          articles={more.slice(0, count)}
          // The call to action is whatever the Single News Page settings say; with no text there is no tile.
          cta={{heading: moreSettings?.ctaHeading, label: moreSettings?.ctaLabel, href: ctaHref}}
        />
      )}
    </>
  )
}
