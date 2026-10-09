import {HelpCircleIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A frequently asked question. The answer is rich text, so it can carry links. */
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      description: 'Groups the question under a heading. Leave empty for the ungrouped list.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the question.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'question', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'question', subtitle: 'category.title'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
