import {BlockContentIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** A tag, a large centred statement and a row of link buttons over line art. Figma: Mission Block. */
export const missionStatement = defineBlock({
  name: 'missionStatement',
  title: 'Mission Statement',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Tag',
      type: 'string',
      initialValue: 'Our mission',
    }),
    defineField({
      name: 'heading',
      title: 'Statement',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'missionLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
          ],
          preview: {select: {title: 'label'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Mission Statement'}),
  },
})
