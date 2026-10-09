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
import LinkRow from '@/components/ui/LinkRow'
import {ExtractPageBuilderType} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

/** One row of an anchor-links item, derived from the generated query result so it cannot drift. */
type AnchorLinkRow = NonNullable<
  Extract<
    NonNullable<ExtractPageBuilderType<'basicLeftRightText'>['rightContent']>[number],
    {_type: 'anchorLinks'}
  >['links']
>[number]

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
  variant?: 'prose' | 'basic' | 'article'
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
          </figure>
        )
      },
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
          : variant === 'article'
            ? `rich-text-article ${className ?? ''}`
            : `prose-a:text-brand prose dark:prose-invert ${className}`
      }
    >
      <PortableText components={components} value={value} />
    </div>
  )
}
