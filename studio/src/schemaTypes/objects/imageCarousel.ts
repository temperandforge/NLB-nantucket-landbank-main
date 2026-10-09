import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField, imageWithAltField} from './blockFields'

/**
 * A horizontally scrolling row of images (Figma: Image Carousel). The eyebrow shows as a tag
 * above the row. An image with a label opens into a green card showing the label and an arrow on
 * hover or focus; with a link it is clickable. The field is still named `caption`, so existing
 * content keeps its text.
 */
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
            defineField({
              name: 'caption',
              title: 'Label',
              type: 'string',
              description: 'Shown on the card when the image is hovered or focused.',
            }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'link',
              description: 'Optional. Leave empty for an image that is not a link.',
            }),
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
