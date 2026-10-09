import {ImageIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField, imageWithAltField} from './blockFields'

/**
 * Full-bleed photo with a light card holding the eyebrow and headline. All three fields are
 * required: the theme fell back to placeholder copy and the page's featured image, and a Sanity
 * page has neither.
 */
export const heroImage = defineBlock({
  name: 'heroImage',
  title: 'Hero - Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({...eyebrowField(), validation: (rule) => rule.required()}),
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
