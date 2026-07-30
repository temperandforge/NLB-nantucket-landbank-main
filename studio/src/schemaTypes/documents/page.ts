import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

import {buildPagePath, MAX_PAGE_DEPTH} from '../../lib/pageHierarchy'

/**
 * Page schema.  Define and edit the fields for the 'page' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 *
 * Pages nest via the 'parent' reference, and the URL is derived from that chain rather than
 * authored: 'slug' holds a single segment, and a page whose parent is About Us lives at
 * /about-us/<slug>. See docs/DECISIONS.md section 2.
 *
 * An ancestor must be published - a draft-only ancestor resolves to null in the published
 * perspective, which silently breaks every descendant's URL.
 */

/** Walk up from a page id, returning ancestor ids nearest-first. */
async function ancestorIds(
  client: {fetch: (query: string, params: Record<string, unknown>) => Promise<string | null>},
  startId: string,
): Promise<string[]> {
  const seen: string[] = []
  let currentId: string | null = startId
  // Bounded well above MAX_DEPTH so a pre-existing cycle terminates instead of hanging.
  for (let hop = 0; hop < 20 && currentId; hop++) {
    const parentId: string | null = await client.fetch(
      `*[_id == $id][0].parent._ref`,
      {id: currentId},
    )
    if (!parentId) break
    if (seen.includes(parentId)) break
    seen.push(parentId)
    currentId = parentId
  }
  return seen
}

/** Strip the drafts. prefix so a draft and its published version compare as the same document. */
function publishedId(id: string): string {
  return id.replace(/^drafts\./, '')
}

export const page = defineType({
  name: 'page',
  title: 'Flexible Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'parent',
      title: 'Parent page',
      type: 'reference',
      to: [{type: 'page'}],
      description:
        'Optional. Nests this page under another one in the URL. Leave empty for a top-level page. The parent must be published, or this page’s URL will break.',
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          const ref = (value as {_ref?: string} | undefined)?._ref
          if (!ref) return true

          const selfId = publishedId(context.document?._id ?? '')
          if (publishedId(ref) === selfId) return 'A page cannot be its own parent.'

          const client = context.getClient({apiVersion: '2025-09-25'})
          const chain = (await ancestorIds(client, ref)).map(publishedId)

          // A cycle would make path computation non-terminating.
          if (chain.includes(selfId)) {
            return 'This would create a loop - the chosen page is already below this one.'
          }
          // chain excludes the parent itself, so its length is the parent's own ancestor count.
          // parent + its ancestors + this page must stay within MAX_PAGE_DEPTH.
          if (chain.length + 2 > MAX_PAGE_DEPTH) {
            return `Pages can be nested ${MAX_PAGE_DEPTH} levels deep at most. Choose a parent nearer the top.`
          }
          return true
        }),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'This page’s own URL segment - one word or hyphenated phrase, no slashes. The full path is built from the parent chain.',
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          const current = slug?.current
          if (!current) return true

          // A single lowercase segment. Slashes are rejected because the path comes from the
          // parent chain, not from the slug.
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)) {
            return 'Use lowercase letters, numbers and hyphens only. No slashes - nesting is set with the Parent page field.'
          }

          // Uniqueness is per-sibling, not global: two different parents may each have a
          // "history" child, and their full paths still differ.
          const selfId = publishedId(context.document?._id ?? '')
          const parentRef = (context.document?.parent as {_ref?: string} | undefined)?._ref ?? null
          const client = context.getClient({apiVersion: '2025-09-25'})
          const duplicate = await client.fetch<string | null>(
            `*[_type == "page"
               && slug.current == $slug
               && !(_id in [$selfId, "drafts." + $selfId])
               && coalesce(parent._ref, "") == $parentRef
             ][0]._id`,
            {slug: current, selfId, parentRef: parentRef ? publishedId(parentRef) : ''},
          )
          if (duplicate) {
            return parentRef
              ? 'Another page under the same parent already uses this slug.'
              : 'Another top-level page already uses this slug.'
          }
          return true
        }),
      options: {
        source: 'name',
        maxLength: 96,
        // Slashes are stripped: a slug is one segment, and nesting comes from 'parent'.
        slugify: (input) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 96),
      },
    }),

    defineField({
      name: 'pathOnly',
      title: 'Path segment only (no page of its own)',
      type: 'boolean',
      initialValue: false,
      description:
        'Turn on for a page that exists only to group its children in the URL, such as "About Us". Its slug still appears in its children’s paths, but the page itself is not viewable and returns 404.',
    }),

    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      // Not required for a path-only page: it is never rendered, so it has no heading to show.
      hidden: ({document}) => Boolean(document?.pathOnly),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.pathOnly) return true
          return value ? true : 'Required'
        }),
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
      hidden: ({document}) => Boolean(document?.pathOnly),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      type: 'array',
      of: [{type: 'callToAction'}, {type: 'infoSection'}],
      hidden: ({document}) => Boolean(document?.pathOnly),
      options: {
        insertMenu: {
          // Configure the "Add Item" menu to display a thumbnail preview of the content type. https://www.sanity.io/docs/studio/array-type#efb1fe03459d
          views: [
            {
              name: 'grid',
              previewImageUrl: (schemaTypeName) =>
                `/static/page-builder-thumbnails/${schemaTypeName}.webp`,
            },
          ],
        },
      },
    }),
  ],
  preview: {
    select: {
      name: 'name',
      slug: 'slug.current',
      pathOnly: 'pathOnly',
      parentSlug: 'parent.slug.current',
      grandparentSlug: 'parent.parent.slug.current',
    },
    prepare({name, slug, pathOnly, parentSlug, grandparentSlug}) {
      // Show the resolved path so the hierarchy is visible in a flat list.
      const path = buildPagePath([grandparentSlug, parentSlug, slug])
      return {
        title: name || 'Untitled',
        subtitle: pathOnly ? `/${path} - path segment only` : path ? `/${path}` : undefined,
      }
    },
  },
})
