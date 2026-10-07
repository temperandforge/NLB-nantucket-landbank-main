import {InboxIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * What a visitor sent. Created only by the submit route; read-only in Studio except for the
 * status. The answers are a snapshot of each question and reply, so they stay readable if the form
 * is edited later. They are personal data: list them separately from content (see structure) and
 * delete them when they are no longer needed. The form reference is weak so a form can be deleted
 * without first deleting its submissions.
 */
export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form submission',
  type: 'document',
  icon: InboxIcon,
  fields: [
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'form'}],
      weak: true,
      readOnly: true,
    }),
    defineField({name: 'formTitle', title: 'Form title', type: 'string', readOnly: true}),
    defineField({name: 'submittedAt', title: 'Submitted', type: 'datetime', readOnly: true}),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'New', value: 'new'},
          {title: 'Reviewed', value: 'reviewed'},
        ],
        layout: 'radio',
      },
      initialValue: 'new',
    }),
    defineField({
      name: 'answers',
      title: 'Answers',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'answer',
          fields: [
            defineField({name: 'name', title: 'Key', type: 'string'}),
            defineField({name: 'label', title: 'Question', type: 'string'}),
            defineField({name: 'value', title: 'Answer', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'newest', by: [{field: 'submittedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'formTitle', submittedAt: 'submittedAt', status: 'status'},
    prepare: ({title, submittedAt, status}) => ({
      title: title || 'Form submission',
      subtitle: [submittedAt && new Date(submittedAt).toLocaleString('en-US'), status]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
