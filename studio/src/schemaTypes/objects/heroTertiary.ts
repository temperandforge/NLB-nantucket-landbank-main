import {TextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField} from './blockFields'

/** Text-only hero: eyebrow and heading on the left, intro on the right, over line art. */
export const heroTertiary = defineType({
  name: 'heroTertiary',
  title: 'Hero - Tertiary',
  type: 'object',
  icon: TextIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Intro', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Hero - Tertiary'}),
  },
})
