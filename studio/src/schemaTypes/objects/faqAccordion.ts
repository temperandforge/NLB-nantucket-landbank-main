import {HelpCircleIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A stack of question-and-answer accordions inside rich text, like Anchor links: each item is a
 * question and an answer that opens under it. Figma: project_single_desktop "faq" (2613:31925, one
 * item is 2613:31926 closed, 2103:36336 open). Items are written here rather than picked from FAQ
 * documents, so they belong to the page they sit on. Put a Section heading (H2) above the block to
 * introduce it; that heading also gets a link in the page's nav.
 */
export const faqAccordion = defineType({
  name: 'faqAccordion',
  title: 'FAQ accordion',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqAccordionItem',
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
          ],
          preview: {
            select: {title: 'question'},
            prepare: ({title}) => ({title: title || 'Untitled question'}),
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {items: 'items'},
    prepare: ({items}) => ({
      title: 'FAQ accordion',
      subtitle: `${items?.length ?? 0} question${items?.length === 1 ? '' : 's'}`,
    }),
  },
})
