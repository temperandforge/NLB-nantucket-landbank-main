import {CalendarIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** The next events. They come from the Events list; past events drop off by themselves. */
export const eventsPreview = defineBlock({
  name: 'eventsPreview',
  title: 'Events Preview',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      initialValue: 'Events - Upcoming',
    }),
    defineField({
      name: 'count',
      title: 'Events shown',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.required().integer().min(1).max(12),
    }),
  ],
  preview: {
    select: {title: 'eyebrow'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Events Preview'}),
  },
})
