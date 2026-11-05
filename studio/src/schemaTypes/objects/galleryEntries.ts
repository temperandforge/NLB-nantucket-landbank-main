import {defineArrayMember, defineField} from 'sanity'

/**
 * The members of a carousel's hand-picked list: an uploaded image, or a related news article,
 * project or event (never a property, DECISIONS 30). Shared by `property.gallery` and the Image
 * Carousel block so the two cannot drift (DECISIONS 27).
 */
export function galleryEntryMembers() {
  return [
    defineArrayMember({
      type: 'image',
      title: 'Image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Important for accessibility and SEO.',
        }),
        defineField({
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional. Shown over the image when it is the one in the middle, e.g. “Trails”.',
        }),
      ],
    }),
    defineArrayMember({
      // Studio stores the member's name as the entry's `_type`, so this is what saved entries say.
      name: 'relatedDocument',
      type: 'reference',
      title: 'Related document',
      to: [{type: 'article'}, {type: 'project'}, {type: 'event'}],
    }),
  ]
}
