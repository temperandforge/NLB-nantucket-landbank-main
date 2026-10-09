import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import {formatDate} from '@/sanity/lib/dates'
import {linkResolver, realHref} from '@/sanity/lib/utils'
import type {DereferencedLink} from '@/sanity/lib/types'

import Link from 'next/link'

import type {NewsItem} from './types'

/** A news article (Figma: image with its categories as tags over the bottom-left, date and title below). */
export default function CardNews({article}: {article: NewsItem}) {
  // A category that was unpublished dereferences to null.
  const tags = (article.categories ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const date = formatDate(article.date)
  const card = (
    <div className="flex w-full flex-col items-start gap-5 md:gap-6">
      <div className="relative flex h-[375px] w-full flex-col items-start justify-end overflow-hidden rounded bg-dusty-heath-800 p-5 md:h-[354px] md:p-6">
        <BlockImage
          image={article.image}
          width={800}
          sizes="(min-width: 768px) 33vw, 100vw"
          fill
          className="absolute inset-0 size-full object-cover"
        />
        {tags.length > 0 && (
          <div className="relative flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
      </div>
      <div className="flex w-full flex-col items-start gap-3 text-on-background">
        {date && <p className="font-sans text-body-large leading-[1.6] md:text-body-base md:text-on-background-subtle">{date}</p>}
        <p className="w-full break-words text-headline-sm leading-[1.2] tracking-normal">{article.title}</p>
      </div>
    </div>
  )
  // The article's own link wins (an external story); otherwise its page.
  const href =
    realHref(article.link ? linkResolver(article.link as DereferencedLink) : null) ??
    (article.slug ? `/news/${article.slug}` : null)
  return href ? (
    <Link href={href} className="block w-full">
      {card}
    </Link>
  ) : (
    card
  )
}
