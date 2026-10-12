import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

/**
 * Project Document schema.  Define and edit the fields for the 'projectDocument' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const projectDocument = defineType({
  name: 'projectDocument',
  title: 'Project Document',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectName',
      title: 'Project Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'Deed', value: 'deed'},
          {title: 'Management Plan', value: 'managementPlan'},
          {title: 'Survey', value: 'survey'},
          {title: 'Meeting Minutes', value: 'meetingMinutes'},
          {title: 'Financial', value: 'financial'},
          {title: 'Other', value: 'other'},
        ],
      },
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'projectName',
    },
  },
})
