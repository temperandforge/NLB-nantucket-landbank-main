import {CalendarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'
import {jumpNavBodyMembers} from '../objects/jumpNavBody'
import {seoField} from '../objects/seo'

/**
 * An event, with a page of its own at /events/<slug> (its address is derived from the slug).
 * Whether it is "upcoming" is worked out from its dates when the page is built or
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'start',
      title: 'Starts',
      type: 'datetime',
      options: {displayTimeZone: 'America/New_York', allowTimeZoneSwitch: false},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'end',
      title: 'Ends',
      type: 'datetime',
      options: {displayTimeZone: 'America/New_York', allowTimeZoneSwitch: false},
      description: 'Optional. An event stays listed until it ends (or, with no end, until it starts).',
      validation: (rule) =>
        rule.custom((end, context) => {
          const start = (context.document as {start?: string} | undefined)?.start
          return end && start && end <= start ? 'The end must be after the start' : true
        }),
    }),
    imageWithAltField({title: 'Image'}),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'The short text shown on event tiles.',
    }),
    defineField({
      name: 'body',
      title: 'Page content',
      type: 'array',
      // Sections and images only: the event page has no jump nav and no FAQ accordion.
      of: jumpNavBodyMembers.filter((member) => member.type === 'block' || member.type === 'image'),
      description:
        'The event page. Use Section heading (H2) for sections such as “Activities” or “Rain Date”, and add images between them.',
    }),
    seoField(),
  ],
  orderings: [{title: 'Start, soonest first', name: 'startAsc', by: [{field: 'start', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'start', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Untitled', subtitle, media}),
  },
})
