import {UsersIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** A grid of staff or commissioners, in each person's Order. They come from the People lists. */
export const peopleGrid = defineBlock({
  name: 'peopleGrid',
  title: 'People Grid',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({
      name: 'source',
      title: 'Show',
      type: 'string',
      options: {
        list: [
          {title: 'Staff', value: 'staff'},
          {title: 'Commissioners', value: 'commissioners'},
        ],
        layout: 'radio',
      },
      initialValue: 'staff',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'heading', source: 'source'},
    prepare: ({title, source}) => ({
      title: title || (source === 'commissioners' ? 'Commissioners' : 'Staff'),
      subtitle: 'People Grid',
    }),
  },
})
