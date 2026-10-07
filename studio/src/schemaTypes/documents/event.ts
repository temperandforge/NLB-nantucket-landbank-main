import {CalendarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * An event. Whether it is "upcoming" is worked out from its dates when the page is built or
 * revalidated, never stored. Times are entered and shown in the site time zone, America/New_York.
 */
export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'start',
      title: 'Starts',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'end',
      title: 'Ends',
      type: 'datetime',
      description: 'Optional. An event stays listed until it ends (or, with no end, until it starts).',
      validation: (rule) =>
        rule.custom((end, context) => {
          const start = (context.document as {start?: string} | undefined)?.start
          return end && start && end <= start ? 'The end must be after the start' : true
        }),
    }),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 4}),
  ],
  orderings: [{title: 'Start, soonest first', name: 'startAsc', by: [{field: 'start', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'start'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
