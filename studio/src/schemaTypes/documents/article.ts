import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'

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
    imageWithAltField({required: true}),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      description: 'The article text. Paragraphs, images, Heading 3-6 and anchor links are available.',
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
  ],
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'date', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Untitled', subtitle, media}),
  },
})
