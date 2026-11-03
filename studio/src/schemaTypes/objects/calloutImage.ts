import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {altTextField, captionField} from './blockFields'

/**
 * A statement set large beside a photo, inside rich text: a figure, a result or a line that
 * deserves more weight than a paragraph but is not a quotation (use Pull quote for that). The image
 * keeps its own proportions, so a portrait photo stays a portrait.
 */
export const calloutImage = defineType({
  name: 'calloutImage',
  title: 'Callout with image',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 4,
      description: 'The statement, set large. Keep it short.',
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [altTextField(), captionField()],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imagePosition',
      title: 'Image position',
      type: 'string',
      options: {
        list: [
          {title: 'Right', value: 'right'},
          {title: 'Left', value: 'left'},
        ],
        layout: 'radio',
      },
      initialValue: 'right',
      description: 'Which side the image is on from tablet width up. On a phone the text comes first.',
    }),
  ],
  preview: {
    select: {title: 'text', media: 'image'},
    prepare: ({title, media}) => ({title: title || 'Empty callout', subtitle: 'Callout with image', media}),
  },
})
