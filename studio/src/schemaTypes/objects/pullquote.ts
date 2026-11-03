import {BlockquoteIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A pull quote inside rich text: a line lifted from the article and set large, between two rules,
 * to break up a long page. It is not a citation (use the Quote style on a paragraph for that), so
 * it carries only the line and an optional attribution.
 */
export const pullquote = defineType({
  name: 'pullquote',
  title: 'Pull quote',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: 'Without quotation marks; they are added for you.',
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Optional. Who said it, e.g. “Jane Doe, Farm Manager”.',
    }),
  ],
  preview: {
    select: {title: 'quote', subtitle: 'attribution'},
    prepare: ({title, subtitle}) => ({title: title || 'Empty pull quote', subtitle}),
  },
})
