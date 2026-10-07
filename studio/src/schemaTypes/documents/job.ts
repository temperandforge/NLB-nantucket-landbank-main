import {CaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A job opening. The tag on its card is the department's title, the same options staff use, so
 * it is never restated here. Where to apply is the shared link, so it can be a page or a URL.
 */
export const job = defineType({
  name: 'job',
  title: 'Job',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
      description: 'Shown as the tag under the title.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'The listing shows the first two lines; keep the important part first.',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'e.g. "In-Person", "Remote" or "Hybrid".',
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment type',
      type: 'string',
      description: 'e.g. "Full Time", "Part Time", "Seasonal" or "Internship".',
    }),
    defineField({
      name: 'applyLink',
      title: 'Apply link',
      type: 'link',
      description: 'Where "Apply now" goes. Leave the URL empty to hide the button.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the title.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'department.title'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
