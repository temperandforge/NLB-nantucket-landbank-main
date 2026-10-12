import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Property Type schema. A taxonomy term used to classify properties
 * (e.g. Conservation Land, Affordable Housing, Open Space).
 */

export const propertyType = defineType({
  name: 'propertyType',
  title: 'Property Type',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
