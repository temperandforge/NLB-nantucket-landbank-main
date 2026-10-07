import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/** Two columns: a coloured panel (eyebrow and body over line art) beside an image. */
export const heroSecondary = defineType({
  name: 'heroSecondary',
  title: 'Hero - Secondary',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      ...eyebrowField(),
      description: 'Defaults to the page name when left empty.',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    imageWithAltField({required: true}),
    defineField({
      name: 'variant',
      title: 'Panel colour',
      type: 'string',
      options: {
        list: [
          {title: 'Green (Lowlands)', value: 'lowlands'},
          {title: 'Brown (Moody Moor)', value: 'moody-moor'},
        ],
        layout: 'radio',
      },
      initialValue: 'lowlands',
    }),
  ],
  preview: {
    select: {eyebrow: 'eyebrow', body: 'body', media: 'image'},
    prepare: ({eyebrow, body, media}) => ({
      title: eyebrow || body || 'Untitled',
      subtitle: 'Hero - Secondary',
      media,
    }),
  },
})
