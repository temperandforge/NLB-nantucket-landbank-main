import {CalendarIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * Every upcoming event as a row: image with a date badge, title, time, place, summary and a
 * "View details" link to the event's page. They come from the Events list; past events drop off
 * by themselves. The page's heading is a separate Hero - Tertiary block above it.
 */
export const eventsGrid = defineBlock({
  name: 'eventsGrid',
  title: 'Events Grid',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'emptyText',
      title: 'Text when there are no upcoming events',
      type: 'string',
      initialValue: 'No upcoming events right now. Check back soon.',
    }),
  ],
  preview: {
    prepare: () => ({title: 'Events Grid', subtitle: 'Every upcoming event'}),
  },
})
