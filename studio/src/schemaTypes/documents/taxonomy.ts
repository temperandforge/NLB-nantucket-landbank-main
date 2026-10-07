import {defineField, defineType, type DocumentDefinition} from 'sanity'

/**
 * A referenced category, so the client can add one without a deploy. The slug is the stable key
 * (URL filters use it), the title is the label, and `order` sets the display order.
 */
export function defineTaxonomy({
  name,
  title,
  icon,
  description,
}: {
  name: string
  title: string
  icon: DocumentDefinition['icon']
  description: string
}) {
  return defineType({
    name,
    title,
    type: 'document',
    icon,
    fields: [
      defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        description,
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        description:
          'The stable key, used in URL filters. Changing it breaks any shared link, so prefer editing the title.',
        options: {source: 'title', maxLength: 96},
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'order',
        title: 'Order',
        type: 'number',
        description: 'Lower numbers come first. Ties fall back to the title.',
      }),
    ],
    orderings: [
      {
        title: 'Order',
        name: 'order',
        by: [
          {field: 'order', direction: 'asc'},
          {field: 'title', direction: 'asc'},
        ],
      },
    ],
    preview: {
      select: {title: 'title', subtitle: 'slug.current'},
      prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
    },
  })
}
