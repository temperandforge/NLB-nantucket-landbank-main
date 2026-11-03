import {RemoveIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A horizontal divider inside rich text, to mark a break between parts of a long article. Full
 * width matches the rule under the article's title; short is a small centred mark for a lighter pause.
 */
export const divider = defineType({
  name: 'divider',
  title: 'Divider',
  type: 'object',
  icon: RemoveIcon,
  fields: [
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          {title: 'Full width line', value: 'full'},
          {title: 'Short centred line', value: 'short'},
        ],
        layout: 'radio',
      },
      initialValue: 'full',
    }),
  ],
  preview: {
    select: {style: 'style'},
    prepare: ({style}) => ({
      title: 'Divider',
      subtitle: style === 'short' ? 'Short centred line' : 'Full width line',
    }),
  },
})
