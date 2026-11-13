import {CaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A job opening. The tag on its card is its department, plain text: unrelated to the staff
 * departments (a job can name a department nobody on staff belongs to). Where to apply is the
 * shared link, so it can be a page or a URL.
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
      type: 'string',
      description: 'Shown as the tag under the title. Free text, e.g. "Property Management".',
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
      description:
        'e.g. "In-Person", "Remote" or "Hybrid". For search engines an in-person or hybrid job is at the Land Bank\'s address (Settings > Organization); a remote one gets no job markup.',
    }),
    defineField({
      name: 'employmentType',
      title: 'Employment type',
      type: 'string',
      description:
        'e.g. "Full Time", "Part Time", "Seasonal" or "Internship". Search engines read these (and Contract, Temporary, Volunteer, Per Diem); any other wording is shown on the card but left out of the job markup.',
    }),
    defineField({
      name: 'datePosted',
      title: 'Date posted',
      type: 'date',
      description: 'Search engines require it to list the job. Without it the job gets no job markup.',
    }),
    defineField({
      name: 'validThrough',
      title: 'Apply by',
      type: 'date',
      description: 'The last day applications are accepted. After it the job is left out of the markup. Leave empty if there is no deadline.',
      validation: (rule) =>
        rule.custom((value, context) => {
          const posted = (context.document as {datePosted?: string} | undefined)?.datePosted
          return value && posted && value < posted ? 'The apply-by date is before the date posted.' : true
        }),
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
    select: {title: 'title', subtitle: 'department'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
