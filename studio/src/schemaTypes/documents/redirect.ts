import {defineField, defineType} from 'sanity'
import {ResetIcon} from '@sanity/icons'

import {buildPagePath, PAGE_LOCATION_SELECT, previewPathToGroq} from '../../lib/pageHierarchy'
import {normaliseSource, STATUS_CODES, validateSourceShape} from '../../lib/redirectSource'

/**
 * Redirect schema. One document per old path. Matching is exact on the path (case-insensitive,
 * trailing slash ignored) and, when the source carries a query string, on that query too. The
 * stored `source` stays as the editor typed it; every comparison goes through normaliseSource.
 * Documents with origin 'auto' are written by a Sanity Function when a page's URL changes.
 */

interface PageRow {
  slug?: string | null
  pathOnly?: boolean | null
  parentSlug?: string | null
  grandparentSlug?: string | null
}

// The same projection Presentation uses, with its preview paths rewritten to GROQ.
const PAGE_PROJECTION = `{${Object.entries(PAGE_LOCATION_SELECT)
  .map(([key, path]) => `"${key}": ${previewPathToGroq(path)}`)
  .join(', ')}}`

const pagePath = (row: PageRow) =>
  `/${buildPagePath([row.grandparentSlug, row.parentSlug, row.slug])}`

/** Strip the drafts. prefix so a draft and its published version compare as the same document. */
function publishedId(id: string): string {
  return id.replace(/^drafts\./, '')
}

/** The path of a source with the query string and trailing slash removed, lowercased. */
const sourcePath = (source: string) => normaliseSource(source).split('?')[0]

export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ResetIcon,
  fields: [
    defineField({
      name: 'source',
      title: 'Old path',
      type: 'string',
      description:
        'The path to redirect from, starting with a slash, like /old-page. Add a query string (/?p=123) to match one. Case and a trailing slash are ignored.',
      validation: (Rule) =>
        Rule.custom(async (source, context) => {
          const shape = validateSourceShape(source)
          if (shape !== true) return shape
          const value = source as string

          const client = context.getClient({apiVersion: '2025-09-25'})
          const selfId = publishedId(context.document?._id ?? '')
          const wanted = normaliseSource(value)

          // 1. Duplicate. Compared in JS: GROQ cannot normalise, and `match` is word-tokenised.
          const others = await client.fetch<string[]>(
            `*[_type == "redirect" && !(_id in [$selfId, "drafts." + $selfId]) && defined(source)].source`,
            {selfId},
          )
          if (others.some((other) => normaliseSource(other) === wanted)) {
            return 'Another redirect already uses this old path.'
          }

          // 2. A live page at this path: the proxy runs before routing, so the redirect would hide it.
          const path = sourcePath(value)
          const lastSegment = path.split('/').filter(Boolean).pop()
          if (lastSegment) {
            const pages = await client.fetch<PageRow[]>(
              `*[_type == "page" && slug.current == $slug] ${PAGE_PROJECTION}`,
              {slug: lastSegment},
            )
            if (pages.some((row) => !row.pathOnly && pagePath(row) === path)) {
              return 'A live page already exists at this path. Redirects run before pages, so this one would hide the page. Delete or move the page first.'
            }
          }

          // 3. Self-loop: the destination page lives at the source path.
          const destination = context.document?.destination as
            | {linkType?: string; page?: {_ref?: string}}
            | undefined
          if (destination?.linkType === 'page' && destination.page?._ref) {
            const target = await client.fetch<PageRow | null>(
              `*[_type == "page" && _id == $id][0] ${PAGE_PROJECTION}`,
              {id: publishedId(destination.page._ref)},
            )
            if (target && !target.pathOnly && pagePath(target) === path) {
              return 'The destination is the page at this old path, so the redirect would loop.'
            }
          }
          return true
        }),
    }),

    defineField({
      name: 'destination',
      title: 'Send visitors to',
      type: 'link',
      description: 'A page on this site or a URL. Not needed for 410 Gone.',
      hidden: ({document}) => document?.statusCode === 410,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const gone = context.document?.statusCode === 410
          const link = value as {linkType?: string; href?: string; page?: {_ref?: string}} | undefined
          if (gone) return true
          if (!link || (link.linkType === 'page' ? !link.page?._ref : !link.href)) {
            return 'A destination is required unless the status is 410 Gone.'
          }
          if (link.linkType !== 'page' && link.href) {
            const href = link.href.trim().toLowerCase()
            if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
              return 'Redirect to a page or an http(s) URL. #, mailto: and tel: links cannot be redirect targets.'
            }
          }
          return true
        }),
    }),

    defineField({
      name: 'statusCode',
      title: 'Status',
      type: 'number',
      initialValue: 301,
      options: {
        layout: 'radio',
        list: [
          {title: '301 Moved permanently', value: 301},
          {title: '302 Found (temporary)', value: 302},
          {title: '303 See other', value: 303},
          {title: '307 Temporary (keeps method)', value: 307},
          {title: '308 Permanent (keeps method)', value: 308},
          {title: '410 Gone (no destination)', value: 410},
        ].filter((item) => (STATUS_CODES as readonly number[]).includes(item.value)),
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'passQuery',
      title: 'Keep the query string',
      type: 'boolean',
      initialValue: true,
      description: 'Append the visitor’s query string (?utm_source=...) to the destination.',
      hidden: ({document}) => document?.statusCode === 410,
    }),

    defineField({
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      initialValue: true,
      description: 'Turn off to pause this redirect without deleting it.',
    }),

    defineField({
      name: 'origin',
      title: 'Created by',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          {title: 'An editor', value: 'manual'},
          {title: 'Automatically, when a page’s URL changed', value: 'auto'},
        ],
      },
      initialValue: 'manual',
    }),

    defineField({
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 2,
      description: 'Optional. Why this redirect exists.',
    }),
  ],
  preview: {
    select: {
      source: 'source',
      statusCode: 'statusCode',
      linkType: 'destination.linkType',
      href: 'destination.href',
      // Preview paths, not GROQ: dereference with dots.
      pageSlug: 'destination.page.slug.current',
      parentSlug: 'destination.page.parent.slug.current',
      grandparentSlug: 'destination.page.parent.parent.slug.current',
      origin: 'origin',
      enabled: 'enabled',
    },
    prepare({source, statusCode, linkType, href, pageSlug, parentSlug, grandparentSlug, origin, enabled}) {
      const pageTarget = pageSlug ? `/${buildPagePath([grandparentSlug, parentSlug, pageSlug])}` : 'a page'
      const target = statusCode === 410 ? 'gone' : linkType === 'page' ? pageTarget : href
      const parts = [`${statusCode ?? 301}`, target ? `→ ${target}` : undefined]
      if (origin === 'auto') parts.push('(auto)')
      if (enabled === false) parts.push('(off)')
      return {title: source || 'No old path', subtitle: parts.filter(Boolean).join(' ')}
    },
  },
})
