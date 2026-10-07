import {ClockIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** Curated milestones in a horizontally scrolling row. */
export const timeline = defineType({
  name: 'timeline',
  title: 'Timeline',
  type: 'object',
  icon: ClockIcon,
  fields: [
    defineField({
      name: 'entries',
      title: 'Entries',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'timelineEntry',
          fields: [
            defineField({
              name: 'year',
              title: 'Year',
              type: 'string',
              description: 'Text, so “1983” and “Early 1980s” both work.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
          ],
          preview: {
            select: {title: 'title', subtitle: 'year'},
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {entries: 'entries'},
    prepare: ({entries}) => ({title: 'Timeline', subtitle: `${entries?.length ?? 0} entries`}),
  },
})
