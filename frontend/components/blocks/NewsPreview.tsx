import Image from 'next/image'
import Link from 'next/link'

import {ArrowDownRightIcon} from '@/components/icons'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'
import {formatDate} from '@/sanity/lib/dates'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

/** A tile that is a link only when its link resolves; otherwise a plain element, never a dead anchor. */
function Tile({
  href,
  className,
  children,
}: {
  href: string | null
  className: string
  children: React.ReactNode
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

export default function NewsPreview({block}: BlockProps<'newsPreview'>) {
  const articles = (block.articles ?? []).slice(0, block.count ?? 2)
  const ctaHref = block.ctaLink ? linkResolver(block.ctaLink as DereferencedLink) : null
  const showCta = Boolean(block.ctaHeading || block.ctaLabel)
  if (articles.length === 0 && !showCta) return null

  return (
    <section className="overflow-x-clip bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && (
          <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>
        )}
        <div className="grid w-full grid-cols-1 gap-px border border-border-light bg-border-light md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const href = article.link ? linkResolver(article.link as DereferencedLink) : null
            // A category whose document was unpublished dereferences to null.
            const category = (article.categories ?? []).find((c) => c?.title)?.title
            const date = formatDate(article.date)
            return (
              <Tile
                key={article._id}
                href={href}
                className="flex w-full min-w-0 flex-col items-start gap-8 overflow-clip bg-background p-8"
              >
                <div className="flex w-full flex-col items-start gap-5">
                  <div className="relative h-[16.5rem] w-full shrink-0 overflow-clip">
                    <BlockImage
                      image={article.image}
                      width={600}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      fill
                      className="size-full object-cover"
                    />
                  </div>
                  <p className="w-full text-headline-base text-on-background">{article.title}</p>
                </div>
                {(category || date) && (
                  <div className="flex shrink-0 items-center gap-3">
                    {category && (
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
                        {category}
                      </p>
                    )}
                    {category && date && (
                      <span className="size-1.5 shrink-0 rounded-full bg-on-background" aria-hidden="true" />
                    )}
                    {date && (
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
                        {date}
                      </p>
                    )}
                  </div>
                )}
              </Tile>
            )
          })}
          {showCta && (
            <Tile
              href={ctaHref}
              className="relative flex w-full min-w-0 flex-col items-start justify-between gap-8 overflow-clip bg-accent-secondary p-10 md:col-span-2 lg:col-span-1"
            >
              <Image
                src="/images/blocks/decorative-line-news.svg"
                alt=""
                aria-hidden="true"
                fill
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center"
              />
              {block.ctaHeading && (
                <p className="relative z-10 w-full text-headline-base text-on-accent-secondary text-balance">
                  {block.ctaHeading}
                </p>
              )}
              <div className="relative z-10 flex w-full items-end justify-between gap-4">
                {block.ctaLabel && (
                  <p className="relative whitespace-nowrap font-mono text-body-small leading-[1.6] tracking-wide text-on-accent-secondary uppercase after:absolute after:top-full after:left-0 after:h-px after:w-full after:bg-on-accent-secondary after:content-['']">
                    {block.ctaLabel}
                  </p>
                )}
                <ArrowDownRightIcon className="h-[4.27rem] w-[4.35rem] shrink-0 text-on-accent-secondary" />
              </div>
            </Tile>
          )}
        </div>
      </div>
    </section>
  )
}
