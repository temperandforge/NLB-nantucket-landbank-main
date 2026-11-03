import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {altTextField, captionField} from './blockFields'

/**
 * A group of images inside rich text, shown side by side in the article column with each image's
 * caption beneath it. For a single image use the plain image (it has a caption too).
 */
export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          name: 'galleryImage',
          options: {hotspot: true},
          fields: [altTextField(), captionField()],
        }),
      ],
      validation: (rule) => rule.required().min(2).max(6),
      description: '2 to 6 images. Drag to reorder. Each image can have its own caption.',
    }),
    defineField({
      name: 'caption',
      title: 'Gallery caption',
      type: 'string',
      description: 'Optional. Shown under the whole gallery, after any image captions.',
    }),
  ],
  preview: {
    select: {images: 'images'},
    prepare: ({images}) => ({
      title: 'Image gallery',
      subtitle: `${images?.length ?? 0} images`,
      media: images?.[0],
    }),
  },
})
