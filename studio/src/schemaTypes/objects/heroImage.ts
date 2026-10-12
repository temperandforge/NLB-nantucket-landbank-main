import {ImageIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField, imageWithAltField} from './blockFields'

/**
 * Full-bleed photo with a light card holding the eyebrow and headline. Heading and image are
 * required; an empty eyebrow falls back to the page title at render.
 */
export const heroImage = defineBlock({
  name: 'heroImage',
  title: 'Hero - Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      ...eyebrowField(),
      description: 'Short label above the heading. Leave empty to use the page title.',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    imageWithAltField({required: true}),
  ],
  preview: {
    select: {title: 'heading', media: 'image'},
    prepare: ({title, media}) => ({title: title || 'Untitled', subtitle: 'Hero - Image', media}),
  },
})
