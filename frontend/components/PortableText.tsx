/**
 * This component uses Portable Text to render a post body.
 *
 * You can learn more about Portable Text on:
 * https://www.sanity.io/docs/block-content
 * https://github.com/portabletext/react-portabletext
 * https://portabletext.org/
 *
 */

import {
  PortableText,
  stegaClean,
  type PortableTextComponents,
  type PortableTextBlock,
} from 'next-sanity'
import ResolvedLink from '@/components/ResolvedLink'
import Image from '@/components/SanityImage'
import FormView from '@/components/ui/form/FormView'
import FaqItem from '@/components/blocks/FaqItem'
import GalleryGrid from '@/components/GalleryGrid'
import VideoEmbed from '@/components/VideoEmbed'
import LinkRow from '@/components/ui/LinkRow'
import {ExtractPageBuilderType} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'
import {videoEmbedSrc} from '@/sanity/lib/video'
import {embedSrc} from '@/sanity/lib/embed'

/** One row of an anchor-links item, derived from the generated query result so it cannot drift. */
type AnchorLinkRow = NonNullable<
  Extract<
    NonNullable<ExtractPageBuilderType<'basicLeftRightText'>['rightContent']>[number],
    {_type: 'anchorLinks'}
  >['links']
>[number]

/** One item of an FAQ accordion, derived from the generated query result so it cannot drift. */
type FaqAccordionItem = NonNullable<
  Extract<
    NonNullable<ExtractPageBuilderType<'jumpNavContent'>['content']>[number],
    {_type: 'faqAccordion'}
  >['items']
>[number]

/** One image of an image gallery block. Typed by hand: the body's query result is a wide union. */
type GalleryImage = {
  _key: string
  asset?: {_ref: string}
  alt?: string
  caption?: string
  crop?: React.ComponentProps<typeof Image>['crop']
  hotspot?: React.ComponentProps<typeof Image>['hotspot']
}

export default function CustomPortableText({
  className,
  value,
  sectionIds,
  variant = 'prose',
}: {
  className?: string
  value: PortableTextBlock[]
  /** Block _key -> id for H2 section headings, so a jump nav can link to them. */
  sectionIds?: Record<string, string>
  /** `prose` uses Tailwind Typography; `basic` uses the nlb-design rich-text styles. */
  variant?: 'prose' | 'basic' | 'article' | 'project'
}) {
  const components: PortableTextComponents = {
    types: {
      anchorLinks: ({value}) => {
        const rows = ((value?.links ?? []) as AnchorLinkRow[]).flatMap((row) => {
          // A row needs a label and a link that resolves; anything else would be a dead row.
          const href = row.link ? linkResolver(row.link) : null
          if (!row.label || !href) return []
          return [
            {
              key: row._key,
              label: row.label,
              href,
              icon: stegaClean(row.icon) === 'download' ? ('download' as const) : ('link' as const),
              newTab: Boolean(row.link?.openInNewTab),
            },
          ]
        })
        if (rows.length === 0) return null
        return (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <LinkRow
                key={row.key}
                label={row.label}
                href={row.href}
                icon={row.icon}
                newTab={row.newTab}
              />
            ))}
          </div>
        )
      },
      faqAccordion: ({value}) => {
        // An item needs a question; an item with no answer still opens to nothing, so it is dropped.
        const items = ((value?.items ?? []) as FaqAccordionItem[]).filter(
          (item) => item?.question && item.answer && item.answer.length > 0,
        )
        if (items.length === 0) return null
        return (
          <div className="flex w-full flex-col gap-5">
            {items.map((item) => (
              <FaqItem key={item._key} question={item.question ?? ''}>
                <CustomPortableText
                  variant="basic"
                  className="[--rich-text-color:var(--color-on-surface-dark)]"
                  value={item.answer as PortableTextBlock[]}
                />
              </FaqItem>
            ))}
          </div>
        )
      },
      image: ({value}) => {
        if (!value?.asset?._ref) {
          return null
        }
        const isArticle = variant === 'article'
        return (
          <figure className={isArticle ? '' : 'my-8'}>
            <Image
              id={value.asset._ref}
              alt={value.alt || ''}
              width={isArticle ? 1640 : 672}
              sizes={isArticle ? '(min-width: 820px) 820px, 100vw' : undefined}
              crop={value.crop}
              // The article crops every image to a strip, so honour the editor's focal point.
              hotspot={isArticle ? value.hotspot : undefined}
              mode="cover"
              className={isArticle ? 'h-[362px] w-full rounded object-cover' : 'rounded-sm'}
            />
            {value.caption && <figcaption className="figure-caption">{value.caption}</figcaption>}
          </figure>
        )
      },
      imageGallery: ({value}) => {
        // An image without an asset would be an empty tile, so it is dropped; fewer than two left is no gallery.
        const images = ((value?.images ?? []) as GalleryImage[]).filter((image) => image?.asset?._ref)
        if (images.length < 2) return null
        return (
          <figure className="image-gallery">
            <GalleryGrid
              images={images.map((image) => ({
                key: image._key,
                id: image.asset!._ref,
                alt: image.alt || '',
                caption: image.caption,
                crop: image.crop,
                hotspot: image.hotspot,
              }))}
            />
            {value?.caption && <figcaption className="figure-caption">{value.caption}</figcaption>}
          </figure>
        )
      },
      calloutImage: ({value}) => {
        // The block is the statement plus its photo; without either it is not this layout.
        const text = typeof value?.text === 'string' ? value.text.trim() : ''
        if (!text || !value?.image?.asset?._ref) return null
        const imageFirst = stegaClean(value.imagePosition) === 'left'
        return (
          <div className={imageFirst ? 'callout-image callout-image--image-first' : 'callout-image'}>
            <p className="callout-image__text">{text}</p>
            <figure className="callout-image__figure">
              <Image
                id={value.image.asset._ref}
                alt={value.image.alt || ''}
                width={640}
                sizes="(min-width: 640px) 320px, 100vw"
                crop={value.image.crop}
                hotspot={value.image.hotspot}
                mode="cover"
                className="h-auto w-full rounded"
              />
              {value.image.caption && (
                <figcaption className="figure-caption">{value.image.caption}</figcaption>
              )}
            </figure>
          </div>
        )
      },
      table: ({value}) => {
        const rows = ((value?.rows ?? []) as {_key: string; cells?: string[]}[]).filter(
          (row) => row.cells && row.cells.length > 0,
        )
        if (rows.length === 0) return null
        const hasHeader = Boolean(value?.firstRowHeader) && rows.length > 1
        const head = hasHeader ? rows[0] : undefined
        const body = hasHeader ? rows.slice(1) : rows
        return (
          <div className="table-block">
            {/* Focusable so a keyboard user can scroll a wide table sideways. */}
            <div className="table-block__scroll" role="region" aria-label={value?.caption || 'Table'} tabIndex={0}>
              <table>
                {value?.caption && <caption>{value.caption}</caption>}
                {head && (
                  <thead>
                    <tr>
                      {head.cells!.map((cell, index) => (
                        <th key={index} scope="col">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row) => (
                    <tr key={row._key}>
                      {row.cells!.map((cell, index) => (
                        <td key={index}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      },
      videoEmbed: ({value}) => {
        // An address that is not YouTube or Vimeo, or has no id, gives no player: show nothing.
        const video = videoEmbedSrc(value?.url)
        if (!video || !value?.title) return null
        return (
          <figure className="video-figure">
            <VideoEmbed src={video.src} title={value.title} />
            {value.caption && <figcaption className="figure-caption">{value.caption}</figcaption>}
          </figure>
        )
      },
      embed: ({value}) => {
        // An address that is not an allowed Google Maps or Calendar embed gives no frame: show nothing.
        const src = embedSrc(value?.url)
        if (!src || !value?.title) return null
        const shape = stegaClean(value.shape)
        return (
          <figure className="embed-figure">
            <div className={`embed-frame embed-frame--${shape === 'standard' || shape === 'square' ? shape : 'wide'}`}>
              {/* Lazy, so a map below the fold requests nothing from Google during the first paint. */}
              <iframe
                src={src}
                title={value.title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="embed-frame__iframe"
              />
            </div>
            {value.caption && <figcaption className="figure-caption">{value.caption}</figcaption>}
          </figure>
        )
      },
      divider: ({value}) => (
        <hr className={stegaClean(value?.style) === 'short' ? 'divider divider--short' : 'divider'} />
      ),
      pullquote: ({value}) => {
        // A pull quote with no line has nothing to show; the attribution alone would be a stray caption.
        const quote = typeof value?.quote === 'string' ? value.quote.trim() : ''
        if (!quote) return null
        const attribution = typeof value?.attribution === 'string' ? value.attribution.trim() : ''
        return (
          <figure className="pullquote">
            <blockquote className="pullquote__text">{quote}</blockquote>
            {attribution && <figcaption className="pullquote__attribution">{attribution}</figcaption>}
          </figure>
        )
      },
      formEmbed: ({value}) => (
        <FormView form={value?.form} className="my-10 w-full" />
      ),
    },
    block: {
      h1: ({children, value}) => (
        // Add an anchor to the h1
        <h1 className="group relative">
          {children}
          <a
            href={`#${value?._key}`}
            className="absolute left-0 top-0 bottom-0 -ml-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </a>
        </h1>
      ),
      h2: ({children, value}) => {
        // In a jump nav, an H2 is a section and takes the id its nav link points at.
        if (sectionIds) {
          return (
            <h2 id={value?._key ? sectionIds[value._key] : undefined} className="scroll-mt-10">
              {children}
            </h2>
          )
        }
        // Add an anchor to the h2
        return (
          <h2 className="group relative">
            {children}
            <a
              href={`#${value?._key}`}
              className="absolute left-0 top-0 bottom-0 -ml-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </a>
          </h2>
        )
      },
    },
    marks: {
      link: ({children, value: link}) => {
        return <ResolvedLink link={link}>{children}</ResolvedLink>
      },
    },
  }

  return (
    <div
      className={
        variant === 'basic'
          ? `rich-text-basic ${className ?? ''}`
          : variant === 'project'
            ? `rich-text-project ${className ?? ''}`
            : variant === 'article'
            ? `rich-text-article ${className ?? ''}`
            : `prose-a:text-brand prose dark:prose-invert ${className}`
      }
    >
      <PortableText components={components} value={value} />
    </div>
  )
}
