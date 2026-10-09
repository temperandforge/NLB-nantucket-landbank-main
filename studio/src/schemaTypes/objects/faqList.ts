import {HelpCircleIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * Every FAQ, grouped under its category. FAQs without a category come first, ungrouped; a
 * category with no FAQs is not shown. Order comes from each document's Order field.
 */
export const faqList = defineBlock({
  name: 'faqList',
  title: 'FAQ List',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'FAQs'}),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Shown under the heading, e.g. "Have questions? No worries, we have the answers."',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'FAQ List'}),
  },
})
