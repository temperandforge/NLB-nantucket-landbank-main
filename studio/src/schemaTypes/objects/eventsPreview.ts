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
      description: 'Up to six, shown two across.',
      validation: (rule) => rule.required().integer().min(1).max(6),
    }),
    defineField({
      name: 'hideWhenEmpty',
      title: 'Hide when there are no upcoming events',
      type: 'boolean',
      group: 'settings',
      initialValue: true,
      description: 'On: the whole section disappears. Off: it stays and shows a "No upcoming events" message.',
    }),
    defineField({
      name: 'button',
      title: 'View more button',
      type: 'button',
      description: 'Shown below the events. Leave the label or link empty to hide it.',
    }),
  ],
  preview: {
    select: {title: 'eyebrow'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Events Preview'}),
  },
})
