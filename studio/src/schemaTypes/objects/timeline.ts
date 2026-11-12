import {ClockIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** Curated milestones in a horizontally scrolling row. */
export const timeline = defineBlock({
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
            defineField({
              name: 'description',
              title: 'Description',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [{title: 'Normal', value: 'normal'}],
                  lists: [{title: 'Bullet', value: 'bullet'}],
                  marks: {
                    decorators: [
                      {title: 'Bold', value: 'strong'},
                      {title: 'Italic', value: 'em'},
                    ],
                    annotations: [{type: 'link'}],
                  },
                }),
              ],
            }),
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
    prepare: ({entries}) => {
      const count = Array.isArray(entries) ? entries.length : 0
      return {
        title: entries?.[0]?.title || 'Timeline',
        subtitle: `Timeline · ${count} ${count === 1 ? 'entry' : 'entries'}`,
      }
    },
  },
})
