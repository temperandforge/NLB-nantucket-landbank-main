import {defineField, defineType, type ObjectDefinition} from 'sanity'

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

/** The caption shown under an image. Optional; unlike alt text it is for every reader, not a description. */
export const captionField = () =>
  defineField({
    name: 'caption',
    title: 'Caption',
    type: 'string',
    description: 'Optional. Shown under the image, e.g. a credit or what the photo shows.',
  })

/** How wide an image is in rich text, as a share of the text column. Phones always show it full width. */
export const imageSizeField = () =>
  defineField({
    name: 'size',
    title: 'Size',
    type: 'string',
    description: 'How wide the image is in the text. On a phone it is always full width.',
    options: {
      layout: 'radio',
      direction: 'horizontal',
      list: [
        {title: 'Small (⅓)', value: 'small'},
        {title: 'Medium (½)', value: 'medium'},
        {title: 'Large (¾)', value: 'large'},
        {title: 'Full width', value: 'full'},
      ],
    },
    initialValue: 'full',
  })

/** Where an image sits in rich text. Left and right let the text wrap around it. */
export const imageAlignField = () =>
  defineField({
    name: 'align',
    title: 'Alignment',
    type: 'string',
    description: 'Left and right wrap the text around the image (when it is narrower than full width).',
    options: {
      layout: 'radio',
      direction: 'horizontal',
      list: [
        {title: 'Left', value: 'left'},
        {title: 'Centre', value: 'center'},
        {title: 'Right', value: 'right'},
      ],
    },
    initialValue: 'center',
  })

/**
 * An image with the alt text stored on the image itself, so it travels with the asset reference
 * in a query. Required where the block makes no sense without it.
 */
export const imageWithAltField = ({
  name = 'image',
  title = 'Image',
  required = false,
  description,
}: {name?: string; title?: string; required?: boolean; description?: string} = {}) =>
  defineField({
    name,
    title,
    description,
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

/**
 * Defines a page-builder block. Content fields go on a Content tab and the settings on a Settings
 * tab. Adds the "Hide this block" setting and marks hidden blocks in the
 * Studio list, so every block gets them the same way. A hidden block stays in the page with its
 * content but is not shown on the live site (see the pageBuilder projection in queries.ts); in
 * Presentation it is shown with a "Hidden" badge so editors can still see and select it.
 */
export function defineBlock(config: ObjectDefinition) {
  const preview = config.preview
  return defineType({
    ...config,
    groups: [
      {name: 'content', title: 'Content', default: true},
      {name: 'settings', title: 'Settings'},
    ],
    fields: [
      ...config.fields.map((field) => ({...field, group: field.group ?? 'content'})),
      defineField({
        name: 'disabled',
        title: 'Hide this block',
        type: 'boolean',
        group: 'settings',
        initialValue: false,
        description:
          'Keeps the block in the page but does not show it on the site. Use it to take a block out without deleting it.',
      }),
    ],
    preview: preview && {
      ...preview,
      select: {...preview.select, disabled: 'disabled'},
      prepare: (selection, viewOptions) => {
        const {disabled, ...rest} = selection
        const base = preview.prepare ? preview.prepare(rest, viewOptions) : {title: 'Block'}
        return {
          ...base,
          subtitle: disabled ? ['Hidden', base.subtitle].filter(Boolean).join(' · ') : base.subtitle,
        }
      },
    },
  })
}
