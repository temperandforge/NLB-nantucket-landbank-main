import {SplitHorizontalIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {eyebrowField, headingLevelField} from './blockFields'

/**
 * Two columns. The left is sticky and holds the eyebrow, heading, text and an optional button;
 * the right is free-form content (text, lists, images). The theme's right column could also hold
 * a Gravity Forms block; forms are deferred, so it cannot here.
 */
export const basicLeftRightText = defineType({
  name: 'basicLeftRightText',
  title: 'Basic - Left Right Text',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h2'),
    defineField({name: 'body', title: 'Left text', type: 'blockContent'}),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      description: 'Shown only when both the text and a link are filled in.',
    }),
    defineField({name: 'rightContent', title: 'Right column', type: 'blockContent'}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Basic - Left Right Text'}),
  },
})
