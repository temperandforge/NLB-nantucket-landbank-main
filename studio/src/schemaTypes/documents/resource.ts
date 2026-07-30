import {defineField, defineType} from 'sanity'
import {DropIcon} from '@sanity/icons'

/**
 * An amenity available at a property - Parking, Restrooms, Dog Friendly and so on.
 *
 * Deliberately a separate document type from propertyType rather than a shared "taxonomy" type:
 * the two are filtered independently on the map, and resources are the likelier of the pair to
 * grow extra fields (an icon for a map legend, for instance).
 */

export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  icon: DropIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown to visitors, e.g. "Handicap Accessible".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in the map filter URL (?resources=parking). Changing it breaks any shared or bookmarked filter link, so prefer editing the title.',
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
