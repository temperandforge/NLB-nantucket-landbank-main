import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'

/**
 * A news item. It has no page of its own yet (per-item pages are slice 3), so `link` is where a
 * tile goes, if anywhere: an external article, or later a page. With no link the tile is plain.
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
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'newsCategory'}]})],
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Where the news tile goes. Leave empty for a tile that is not a link.',
    }),
  ],
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'date', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Untitled', subtitle, media}),
  },
})
