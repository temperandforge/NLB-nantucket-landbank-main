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

const settingsFieldset = {
  name: 'settings',
  title: 'Settings',
  options: {collapsible: true, collapsed: true},
}

/**
 * Defines a page-builder block. Adds the "Hide this block" setting and marks hidden blocks in the
 * Studio list, so every block gets them the same way. A hidden block stays in the page with its
 * content but is not shown on the live site (see the pageBuilder projection in queries.ts); in
 * Presentation it is shown with a "Hidden" badge so editors can still see and select it.
 */
export function defineBlock(config: ObjectDefinition) {
  const preview = config.preview
  return defineType({
    ...config,
    fieldsets: [...(config.fieldsets ?? []), settingsFieldset],
    fields: [
      ...config.fields,
      defineField({
        name: 'disabled',
        title: 'Hide this block',
        type: 'boolean',
        fieldset: 'settings',
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
