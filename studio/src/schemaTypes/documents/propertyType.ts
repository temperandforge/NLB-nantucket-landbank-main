import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

/**
 * A kind of property - Beach, Trail, Conservation Land and so on.
 *
 * A document rather than a hardcoded list so the client can add a category without a deploy.
 * Projects reference these, and the map filters by them.
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
      description: 'Shown to visitors, e.g. "Conservation Land".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in the map filter URL (?propertyType=beach). Changing it breaks any shared or bookmarked filter link, so prefer editing the title.',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current'},
    prepare({title, slug}) {
      return {title: title || 'Untitled', subtitle: slug}
    },
  },
})
