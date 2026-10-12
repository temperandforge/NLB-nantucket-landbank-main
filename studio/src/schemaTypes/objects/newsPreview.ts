import {DocumentTextIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * The latest news, with a call-to-action tile. The articles come from the News Articles list,
 * optionally narrowed to one category (e.g. Agriculture news on the Agriculture page).
 */
export const newsPreview = defineBlock({
  name: 'newsPreview',
  title: 'News Preview',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Nantucket News'}),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'newsCategory'}],
      description: 'Optional. Show only articles in this category. Leave empty for the latest of all news.',
    }),
    defineField({
      name: 'count',
      title: 'Articles shown',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.required().integer().min(1).max(12),
    }),
    defineField({
      name: 'ctaHeading',
      title: 'Call to action',
      type: 'string',
      initialValue: 'Check out what is happening with the latest NLB news.',
    }),
    defineField({name: 'ctaLabel', title: 'Call to action label', type: 'string', initialValue: 'View all news'}),
    defineField({
      name: 'ctaLink',
      title: 'Call to action link',
      type: 'link',
      description: 'Leave empty for a tile that is not a link.',
    }),
  ],
  preview: {
    select: {title: 'heading', category: 'category.title'},
    prepare: ({title, category}) => ({
      title: title || 'Untitled',
      subtitle: category ? `News Preview · ${category}` : 'News Preview',
    }),
  },
})
