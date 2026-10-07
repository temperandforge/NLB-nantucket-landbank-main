import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A Land Bank commissioner. */
export const commissioner = defineType({
  name: 'commissioner',
  title: 'Commissioner',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'title', title: 'Role', type: 'string', description: 'e.g. Chair.'}),
    defineField({
      name: 'startDate',
      title: 'Serving since',
      type: 'date',
      description: 'Shown as "Since Month YYYY".',
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown tall (about 4:5). The person’s name is used as its alt text.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the name.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'name', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'title', media: 'headshot'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Unnamed', subtitle, media}),
  },
})
