import Image from 'next/image'
import {stegaClean} from 'next-sanity'
import Link from 'next/link'

import {ArrowDownRightIcon} from '@/components/icons'
import {articleHref, singleHref} from '@/sanity/lib/utils'
import {formatDate} from '@/sanity/lib/dates'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

type Article = NonNullable<BlockProps<'newsPreview'>['block']['articles']>[number]

type Cta = {heading?: string | null; label?: string | null; href: string | null}

// `group` drives the hover and focus states of the pieces inside a tile. Tailwind only applies
// hover where the device can hover, so a tap never leaves a tile stuck in its hover state. The
// ring is inset because the grid's overflow-clip would cut an outer one.
const TILE = 'group focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current'

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
  // `data-part`: a tile is one unit for the page-enter animation (see motion.css), not its pieces.
  return href ? (
    <Link href={href} className={`${TILE} ${className}`} data-part="">
      {children}
    </Link>
  ) : (
    <div className={className} data-part="">
      {children}
    </div>
  )
}

// Literal class names so Tailwind sees them. The CTA tile takes whatever columns the last row of
// articles leaves free (2 columns from md, 3 from lg), so the grid never ends in an empty cell.
const MD_CTA_SPAN = ['md:col-span-2', 'md:col-span-1'] as const
const LG_CTA_SPAN = ['lg:col-span-3', 'lg:col-span-2', 'lg:col-span-1'] as const

export default function NewsPreviewView({
  heading,
  articles,
  cta,
}: {
  heading?: string | null
  articles: Article[]
  cta?: Cta | null
}) {
  // stegaClean: in Presentation an empty string is encoded as invisible characters and would
  // read as text, showing an empty tile that production does not.
  const showCta = Boolean(cta && (stegaClean(cta.heading) || stegaClean(cta.label)))
  if (articles.length === 0 && !showCta) return null

  return (
    <section className="overflow-x-clip bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {heading && <h2 className="w-full text-headline-xl text-on-background">{heading}</h2>}
        <div className="grid w-full grid-cols-1 border-t border-l border-border-light md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            // The article's own link wins (an external story); otherwise its page.
            const href = singleHref(article.externalUrl, article.slug, articleHref)
            // A category whose document was unpublished dereferences to null.
            const category = (article.categories ?? []).find((c) => c?.title)?.title
            const date = formatDate(article.date)
            return (
              <Tile
                key={article._id}
                href={href}
                className="flex w-full min-w-0 flex-col items-start gap-8 overflow-clip border-r border-b border-border-light bg-background p-8"
              >
                <div className="flex w-full flex-col items-start gap-5">
                  <div className="relative h-[16.5rem] w-full shrink-0 overflow-clip">
                    <BlockImage
                      image={article.image}
                      width={600}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      fill
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
                    />
                  </div>
                  <p className="w-full text-headline-base text-on-background underline decoration-transparent decoration-1 underline-offset-4 transition-[text-decoration-color] duration-300 group-hover:decoration-current group-focus-visible:decoration-current motion-reduce:transition-none">
                    {article.title}
                  </p>
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
          {showCta && cta && (
            <Tile
              href={cta.href}
              className={`relative flex w-full min-w-0 flex-col items-start justify-between gap-8 overflow-clip border-r border-b border-border-light bg-accent-secondary p-10 min-h-[540px] md:min-h-0 ${MD_CTA_SPAN[articles.length % 2]} ${LG_CTA_SPAN[articles.length % 3]}`}
            >
              <Image
                src="/images/blocks/decorative-line-news.svg"
                alt=""
                aria-hidden="true"
                fill
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center"
              />
              {cta.heading && (
                <p className="relative z-10 w-full text-headline-base text-on-accent-secondary text-balance">
                  {cta.heading}
                </p>
              )}
              <div className="relative z-10 flex w-full items-end justify-between gap-4">
                {cta.label && (
                  <p className="relative whitespace-nowrap font-mono text-body-small leading-[1.6] tracking-wide text-on-accent-secondary uppercase after:absolute after:top-full after:left-0 after:h-px after:w-full after:bg-on-accent-secondary after:content-['']">
                    {cta.label}
                  </p>
                )}
                <ArrowDownRightIcon className="h-[4.27rem] w-[4.35rem] shrink-0 text-on-accent-secondary transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:translate-y-1 group-focus-visible:translate-x-1 group-focus-visible:translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0 motion-reduce:group-focus-visible:translate-x-0 motion-reduce:group-focus-visible:translate-y-0" />
              </div>
            </Tile>
          )}
        </div>
      </div>
    </section>
  )
}
