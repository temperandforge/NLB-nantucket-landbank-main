import {ThListIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {altTextField, headingLevelField} from './blockFields'

/**
 * A heading with a sticky section nav on the left and long-form content on the right. The nav is
 * not authored: it is built from the content's H3 headings, so editors maintain the content once.
 * H1 and H2 are not offered in the content because the block's own heading is the page-level
 * heading and H3 must unambiguously mean "a section of the nav".
 */
export const jumpNavContent = defineType({
  name: 'jumpNavContent',
  title: 'Jump Nav Content',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h1'),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      description: 'Each “Section heading (H3)” becomes a link in the left-hand nav.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Section heading (H3)', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'H5', value: 'h5'},
            {title: 'H6', value: 'h6'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {annotations: [{type: 'link'}]},
        }),
        defineArrayMember({type: 'image', options: {hotspot: true}, fields: [altTextField()]}),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Jump Nav Content'}),
  },
})
