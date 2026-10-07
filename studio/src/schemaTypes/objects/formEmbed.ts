import {ClipboardIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A form placed inside rich text. A strong reference, so an embedded form cannot be deleted. */
export const formEmbed = defineType({
  name: 'formEmbed',
  title: 'Form',
  type: 'object',
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'form'}],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'form.title'},
    prepare: ({title}) => ({title: title || 'No form chosen', subtitle: 'Form', media: ClipboardIcon}),
  },
})
