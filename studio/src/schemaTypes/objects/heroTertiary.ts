import {TextIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'

/** Text-only hero: eyebrow and heading on the left, intro on the right, over line art. */
export const heroTertiary = defineBlock({
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
