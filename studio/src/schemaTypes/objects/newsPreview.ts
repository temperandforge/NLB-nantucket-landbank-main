import {DocumentTextIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** The latest news, with a call-to-action tile. The articles come from the News Articles list. */
export const newsPreview = defineBlock({
  name: 'newsPreview',
  title: 'News Preview',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Nantucket News'}),
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
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'News Preview'}),
  },
})
