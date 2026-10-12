import {HomeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Property schema. Each property must be assigned to one or more
 * Property Types and may have one or more Resources attached.
 */

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'propertyTypes',
      title: 'Property Types',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'propertyType'}]})],
      validation: (rule) => rule.required().min(1).error('Assign at least one property type'),
    }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'resource'}]})],
      validation: (rule) => rule.required().min(1).error('Assign at least one resource'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'name',
    },
  },
})
