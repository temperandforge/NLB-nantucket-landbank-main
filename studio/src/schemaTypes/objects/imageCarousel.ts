import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField, imageWithAltField} from './blockFields'

/** A horizontally scrolling row of captioned images. */
export const imageCarousel = defineBlock({
  name: 'imageCarousel',
  title: 'Image Carousel',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    eyebrowField(),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'carouselImage',
          fields: [
            imageWithAltField({required: true}),
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
          ],
          preview: {
            select: {title: 'caption', media: 'image'},
            prepare: ({title, media}) => ({title: title || 'Image', media}),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'eyebrow', images: 'images'},
    prepare: ({title, images}) => ({
      title: title || 'Untitled',
      subtitle: `Image Carousel · ${images?.length ?? 0} images`,
    }),
  },
})
