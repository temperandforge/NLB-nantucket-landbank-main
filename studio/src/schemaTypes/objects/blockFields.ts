import {defineField} from 'sanity'

/** The small uppercase label above a heading. Optional everywhere in the theme. */
export const eyebrowField = () =>
  defineField({
    name: 'eyebrow',
    title: 'Eyebrow',
    type: 'string',
    description: 'Short label shown in small capitals above the heading.',
  })

/**
 * The alt text field for an image. Required whenever the image has an asset, so an image cannot be
 * published announced as decorative by accident.
 */
export const altTextField = () =>
  defineField({
    name: 'alt',
    title: 'Alt text',
    type: 'string',
    description: 'Describe the image for people using a screen reader.',
    validation: (rule) =>
      rule.custom((value, context) => {
        const image = context.parent as {asset?: unknown} | undefined
        return image?.asset && !value ? 'Alt text is required when an image is set' : true
      }),
  })

/**
 * An image with the alt text stored on the image itself, so it travels with the asset reference
 * in a query. Required where the block makes no sense without it.
 */
export const imageWithAltField = ({
  name = 'image',
  title = 'Image',
  required = false,
}: {name?: string; title?: string; required?: boolean} = {}) =>
  defineField({
    name,
    title,
    type: 'image',
    options: {hotspot: true},
    fields: [altTextField()],
    validation: required ? (rule) => rule.required() : undefined,
  })

/**
 * The semantic level of a block's heading. A page with no hero above needs one real H1, so this
 * is an accessibility decision rather than a style choice.
 */
export const headingLevelField = (initial: 'h1' | 'h2') =>
  defineField({
    name: 'headingLevel',
    title: 'Heading level',
    type: 'string',
    options: {
      list: [
        {title: 'H1 (the page’s main heading)', value: 'h1'},
        {title: 'H2', value: 'h2'},
      ],
      layout: 'radio',
    },
    initialValue: initial,
    description: 'Use H1 only once per page.',
  })
