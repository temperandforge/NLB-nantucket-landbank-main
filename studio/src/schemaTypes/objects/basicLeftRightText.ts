import {SplitHorizontalIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField, headingLevelField} from './blockFields'

/**
 * Two columns (Figma: Basic - Left Right). The left holds the eyebrow, heading and optional
 * buttons; the right is rich text (section headings, paragraphs) and anchor links. The theme's
 * left-column text and single button no longer exist. The button styles are the design system's
 * three, defaulting to Primary: the Figma links given did not specify one.
 */
export const basicLeftRightText = defineBlock({
  name: 'basicLeftRightText',
  title: 'Basic - Left Right Text',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h2'),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      description: 'Shown on the left, under the heading. Optional.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'blockButton',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
            defineField({
              name: 'variant',
              title: 'Style',
              type: 'string',
              options: {
                list: [
                  {title: 'Primary', value: 'primary'},
                  {title: 'Secondary (gold)', value: 'secondary'},
                  {title: 'Ghost', value: 'ghost'},
                ],
                layout: 'radio',
              },
              initialValue: 'primary',
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'variant'}},
        }),
      ],
    }),
    defineField({
      name: 'rightContent',
      title: 'Right column',
      type: 'blockContent',
      description:
        'Section headings (Heading 3), paragraphs, and anchor links for downloads or related pages.',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Basic - Left Right Text'}),
  },
})
