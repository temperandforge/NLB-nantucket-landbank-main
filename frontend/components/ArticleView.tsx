import type {PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import ShareLinks from '@/components/ShareLinks'
import Tag from '@/components/ui/Tag'
import {formatDate} from '@/sanity/lib/dates'
import type {ArticleQueryResult} from '@/sanity.types'

/**
 * A news article (Figma: news_content_desktop). Everything but the title is optional and simply
 * absent when missing: a category that was unpublished dereferences to null.
 */
export default function ArticleView({article}: {article: NonNullable<ArticleQueryResult>}) {
  const categories = (article.categories ?? []).flatMap((c) => (c?.title ? [{key: c.slug ?? c.title, label: c.title}] : []))
  const date = formatDate(article.date)

  return (
    <article className="relative flex w-full flex-col items-center overflow-clip bg-background tf-px py-24">
      <div
        className="article-curve pointer-events-none absolute left-0 top-[332px] h-[1110px] w-[1840px] max-w-none"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-[820px] flex-col items-start gap-16">
        <p className="whitespace-nowrap font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
          Nantucket News
        </p>
        <div className="flex w-full flex-col items-start gap-10">
          <div className="flex w-full flex-col items-start gap-3">
            <h1 className="w-full text-headline-xl text-on-background">{article.title}</h1>
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {categories.map((category) => (
                  <Tag key={category.key} label={category.label} />
                ))}
              </div>
            )}
            {date && (
              <p className="font-sans text-body-large leading-[1.6] text-on-background-subtle">
                Published: {date}
              </p>
            )}
          </div>
          <hr className="w-full border-0 border-t border-dusty-heath-700" />
          {article.body && article.body.length > 0 && (
            <CustomPortableText
              variant="article"
              className="w-full"
              value={article.body as PortableTextBlock[]}
            />
          )}
        </div>
        <ShareLinks />
      </div>
    </article>
  )
}
