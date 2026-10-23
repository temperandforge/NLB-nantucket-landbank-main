import {HelpCircleIcon} from '@sanity/icons'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
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
      description:
        'Groups the question under a heading. Leave empty to use the catch-all category from FAQ Settings, or the ungrouped list if there is none.',
    }),
    // Set by dragging in the FAQs list (Studio > FAQs), not edited here.
    orderRankField({type: 'faq'}),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {title: 'question', subtitle: 'category.title'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
