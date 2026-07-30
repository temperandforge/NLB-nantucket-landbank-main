import {defineField, defineType} from 'sanity'
import {InfoOutlineIcon} from '@sanity/icons'

/**
 * A labelled column of plain lines in the footer's top band - "Contact", "Address",
 * "Office Hours" in the design.
 *
 * Deliberately generic rather than typed phone/fax/address fields: the design bakes the
 * labels into the content ("Phone: 508-228-7240"), all three columns are visually identical,
 * and this lets the client rename, reorder, or add a column without a schema change.
 */

export const infoColumn = defineType({
  name: 'infoColumn',
  title: 'Info Column',
  type: 'object',
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Rendered as a tracked uppercase label, e.g. "Contact".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lines',
      title: 'Lines',
      type: 'array',
      of: [{type: 'infoLine'}],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: {heading: 'heading', lines: 'lines'},
    prepare({heading, lines}) {
      const count = Array.isArray(lines) ? lines.length : 0
      return {
        title: heading || 'Untitled column',
        subtitle: `${count} line${count === 1 ? '' : 's'}`,
      }
    },
  },
})
