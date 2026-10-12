import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Resource schema. A downloadable file or external link attached to
 * one or more properties (e.g. deed restrictions, management plans, maps).
 */

export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
    }),
    defineField({
      name: 'url',
      title: 'External URL',
      type: 'url',
      validation: (rule) =>
        rule.uri({scheme: ['http', 'https']}).error('Must be a valid URL starting with http:// or https://'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'url',
    },
  },
})
