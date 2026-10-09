import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A member of staff. The card's tag is the department's title, so it is never restated here. */
export const staffMember = defineType({
  name: 'staffMember',
  title: 'Staff Member',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'title', title: 'Job title', type: 'string'}),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown at roughly 4:5. The person’s name is used as its alt text.',
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
