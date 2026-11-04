import {defineArrayMember, defineField} from 'sanity'

/**
 * The members of a carousel's hand-picked list: an uploaded image, or a related news article,
 * project, property or event. Shared by `property.gallery` and the Image Carousel block so the two
 * cannot drift (DECISIONS 27). `excludeSelf` keeps a property from listing itself.
 */
export function galleryEntryMembers({excludeSelf = false}: {excludeSelf?: boolean} = {}) {
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
      to: [{type: 'article'}, {type: 'project'}, {type: 'property'}, {type: 'event'}],
      options: excludeSelf
        ? {
            filter: ({document}) => ({
              filter: '_id != $self',
              params: {self: String(document._id).replace(/^drafts\./, '')},
            }),
          }
        : undefined,
    }),
  ]
}
