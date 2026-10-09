import {TextIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField, headingLevelField} from './blockFields'

/**
 * Text-only header: eyebrow and heading on the left, intro on the right, over line art. Set the
 * heading to H2 for a section intro further down a page (nlb-design's Section Intro).
 */
export const heroTertiary = defineBlock({
  name: 'heroTertiary',
  title: 'Hero - Tertiary',
  type: 'object',
  icon: TextIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h1'),
    defineField({name: 'body', title: 'Intro', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'heading', eyebrow: 'eyebrow'},
    prepare: ({title, eyebrow}) => ({title: title || eyebrow || 'No heading yet', subtitle: 'Hero - Tertiary'}),
  },
})
