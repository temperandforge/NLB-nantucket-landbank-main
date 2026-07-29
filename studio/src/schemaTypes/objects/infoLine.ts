import {defineField, defineType} from 'sanity'

/**
 * One line inside a footer info column, e.g. "Phone: 508-228-7240" or "MA 02554".
 *
 * The optional href exists so an email line can be a real mailto: and a phone line a real
 * tel:, while an address line stays plain text. Explicit rather than auto-detected from the
 * text - the client decides which lines are actionable.
 */

export const infoLine = defineType({
  name: 'infoLine',
  title: 'Line',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'url',
      description:
        'Optional. Use mailto:someone@example.com for email or tel:+15082287240 for phone. Leave empty to render as plain text.',
      // The default url validation only allows http/https, which would reject the mailto:
      // and tel: schemes this field exists for.
      validation: (Rule) => Rule.uri({scheme: ['http', 'https', 'mailto', 'tel']}),
    }),
  ],
  preview: {
    select: {title: 'text', subtitle: 'href'},
  },
})
