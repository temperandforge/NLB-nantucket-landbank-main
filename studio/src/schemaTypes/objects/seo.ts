import {defineField, defineType} from 'sanity'

import {altTextField} from './blockFields'

/**
 * Optional per-page search and social overrides. Everything left empty falls back to the page's own
 * name, description and image, then to the site defaults in Settings. The canonical URL is not a
 * field: it is derived from the page's own address so it cannot point somewhere else.
 */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Search title',
      type: 'string',
      description:
        'Replaces the page name, with no site name added, in search results and social cards. Aim for 60 characters or fewer.',
      // Settings holds site-wide defaults; a default title and a site-wide noindex are not used.
      hidden: ({document}) => document?._type === 'settings',
      validation: (rule) => rule.max(60).warning('Search engines usually cut titles off past 60 characters'),
    }),
    defineField({
      name: 'description',
      title: 'Search description',
      type: 'text',
      rows: 3,
      description: 'Overrides the summary shown in search results. Aim for 160 characters or fewer.',
      validation: (rule) => rule.max(160).warning('Search engines usually cut descriptions off past 160 characters'),
    }),
    defineField({
      name: 'image',
      title: 'Social image',
      type: 'image',
      description: 'Overrides the image on social cards. Shown at 1200 x 627.',
      options: {hotspot: true},
      fields: [altTextField()],
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
      description: 'Asks search engines not to list this page, and leaves it out of the sitemap.',
      hidden: ({document}) => document?._type === 'settings',
    }),
  ],
})

/**
 * The `seo` field as it appears on a document. Pass `group` for a document that already splits its
 * fields into tabs; on one that does not, adding a tab would hide every other field, so it is left
 * as a collapsed section at the end.
 */
export const seoField = (group?: string) =>
  defineField({
    name: 'seo',
    title: 'SEO',
    type: 'seo',
    group,
    options: group ? undefined : {collapsible: true, collapsed: true},
  })

export const seoGroup = {name: 'seo', title: 'SEO'}
