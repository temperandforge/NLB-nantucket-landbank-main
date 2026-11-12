import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {blockContentMembers} from '../objects/blockContent'
import {imageWithAltField} from '../objects/blockFields'
import {seoField} from '../objects/seo'

/**
 * A news item, with a page of its own at /news/<slug>. `externalUrl` is an optional override for
 * where its news tile goes (a story on another site); without it the tile goes to the article's page.
 */
export const article = defineType({
  name: 'article',
  title: 'News Article',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    imageWithAltField({
      description:
        'Optional. The news tile and the social preview use it. Without one they use the fallback image in Article Page Settings.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: blockContentMembers({pullquote: true, gallery: true, divider: true, mediaText: true, table: true, video: true, embed: true}),
      description:
        'The article text. Paragraphs, quotes, pull quotes, images (with captions), image galleries, Media & text blocks, tables, videos, map and calendar embeds, dividers, Heading 3-6 and anchor links are available.',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'newsCategory'}]})],
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
      description:
        'Optional. Only for an article that lives on another site: the news tile goes to this address instead of the article page. Leave empty to use the article page.',
    }),
    seoField(),
  ],
  orderings: [
    {title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]},
    {title: 'Title, A to Z', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
    {title: 'Title, Z to A', name: 'titleDesc', by: [{field: 'title', direction: 'desc'}]},
  ],
  preview: {
    // Preview paths, not GROQ: a reference is dereferenced with dots. Four is more than any article has.
    select: {
      title: 'title',
      media: 'image',
      category0: 'categories.0.title',
      category1: 'categories.1.title',
      category2: 'categories.2.title',
      category3: 'categories.3.title',
    },
    prepare: ({title, media, category0, category1, category2, category3}) => ({
      title: title || 'Untitled',
      subtitle: [category0, category1, category2, category3].filter(Boolean).join(', ') || 'No categories',
      media,
    }),
  },
})
