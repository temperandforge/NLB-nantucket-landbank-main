import {LeaveIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, imageWithAltField} from './blockFields'

/** How many growers show before "View more growers" is pressed. Mirrored in the frontend. */
export const GROWERS_PAGE_SIZE = 6

/**
 * A heading and intro above a two-column grid of growers (Figma: Growers). Each grower is an image
 * with a tag across its foot and the name below. The first six show; "View more growers" reveals
 * the rest. The tag is metadata shown on the card, not a filter.
 */
export const growers = defineBlock({
  name: 'growers',
  title: 'Growers',
  type: 'object',
  icon: LeaveIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Our Nantucket Growers',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    defineField({
      name: 'growers',
      title: 'Growers',
      type: 'array',
      description: `The first ${GROWERS_PAGE_SIZE} show on the page; the rest appear when a visitor presses "View more growers".`,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'grower',
          fields: [
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            imageWithAltField({required: true}),
            defineField({
              name: 'tag',
              title: 'Tag',
              type: 'string',
              description: 'Shown across the foot of the image, e.g. "On Land Bank Land".',
            }),
          ],
          preview: {
            select: {title: 'name', subtitle: 'tag', media: 'image'},
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading', growers: 'growers'},
    prepare: ({title, growers}) => ({
      title: title || 'Growers',
      subtitle: `Growers · ${growers?.length ?? 0}`,
    }),
  },
})
