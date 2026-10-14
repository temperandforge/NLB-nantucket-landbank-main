import {ClipboardIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A form editors build and place on a page: in a Basic Left Right Text block's right column, or in
 * a Contact Form block. Not a singleton, so Sanity generates its id. What visitors submit is stored
 * as `formSubmission` documents.
 */
export const form = defineType({
  name: 'form',
  title: 'Form',
  type: 'document',
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'For editors and the submissions list; visitors do not see it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'submitLabel',
      title: 'Submit button label',
      type: 'string',
      initialValue: 'Submit',
    }),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 3,
      description: 'Shown in place of the form once it has been sent.',
      initialValue: 'Thank you. Your message has been sent.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'formSection',
          fields: [
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              description: 'Optional. Shown above the section’s fields (e.g. “Mailing address”).',
            }),
            defineField({
              name: 'columns',
              title: 'Columns',
              type: 'number',
              options: {
                list: [
                  {title: 'One column', value: 1},
                  {title: 'Two columns', value: 2},
                ],
                layout: 'radio',
              },
              initialValue: 1,
            }),
            defineField({
              name: 'fields',
              title: 'Fields',
              type: 'array',
              of: [defineArrayMember({type: 'formField'})],
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: {title: 'heading', fields: 'fields'},
            prepare: ({title, fields}) => ({
              title: title || 'Untitled section',
              subtitle: `${(fields ?? []).length} field${(fields ?? []).length === 1 ? '' : 's'}`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {select: {title: 'title'}, prepare: ({title}) => ({title: title || 'Untitled form'})},
})
