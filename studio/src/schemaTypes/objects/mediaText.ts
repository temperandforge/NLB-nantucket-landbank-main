import {SplitHorizontalIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {altTextField, captionField} from './blockFields'

/**
 * Text beside a photo, inside rich text. The text is light rich text (paragraphs, bold, italic,
 * links, bullet list) and is set at one of two sizes: Body text, for a paragraph or two that goes
 * with a picture, or Large statement, for a figure, a result or a line that deserves more weight
 * than a paragraph but is not a quotation (use Pull quote for that). The image keeps its own
 * proportions, so a portrait photo stays a portrait.
 *
 * Replaced `calloutImage` (a plain-text statement only); no document used that type when it was
 * renamed, so there is nothing to migrate.
 */
export const mediaText = defineType({
  name: 'mediaText',
  title: 'Media & text',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: 'content',
      title: 'Text',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [{title: 'Bullet', value: 'bullet'}],
          marks: {annotations: [{type: 'link'}]},
        }),
      ],
      validation: (rule) =>
        rule.required().custom((value, context) => {
          const size = (context.parent as {size?: string} | undefined)?.size
          const blocks = (value ?? []) as Array<{children?: Array<{text?: string}>}>
          const length = blocks.reduce(
            (total: number, block) => total + (block.children ?? []).reduce((n: number, c) => n + (c.text?.length ?? 0), 0),
            0,
          )
          return size === 'statement' && length > 280
            ? 'A large statement should be short (280 characters at most); use Body text for longer copy'
            : true
        }),
    }),
    defineField({
      name: 'size',
      title: 'Text size',
      type: 'string',
      options: {
        list: [
          {title: 'Body text', value: 'body'},
          {title: 'Large statement', value: 'statement'},
        ],
        layout: 'radio',
      },
      initialValue: 'body',
      description: 'Body text is a normal paragraph. Large statement sets a short line large, like a pull figure.',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [altTextField(), captionField()],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imagePosition',
      title: 'Image position',
      type: 'string',
      options: {
        list: [
          {title: 'Right', value: 'right'},
          {title: 'Left', value: 'left'},
        ],
        layout: 'radio',
      },
      initialValue: 'right',
      description: 'Which side the image is on from tablet width up. On a phone the text comes first.',
    }),
  ],
  preview: {
    select: {title: 'content.0.children.0.text', media: 'image'},
    prepare: ({title, media}) => ({title: title || 'Empty block', subtitle: 'Media & text', media}),
  },
})
