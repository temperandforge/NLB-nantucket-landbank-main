import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, imageWithAltField} from './blockFields'

/** Centred hero: eyebrow, heading, intro and a wide image. */
export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: ImageIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Intro', type: 'text', rows: 3}),
    imageWithAltField(),
  ],
  preview: {
    select: {title: 'heading', media: 'image'},
    prepare: ({title, media}) => ({title: title || 'Untitled', subtitle: 'Hero', media}),
  },
})
