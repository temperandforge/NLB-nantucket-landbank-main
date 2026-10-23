import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {defineField, defineType, type DocumentDefinition, type FieldDefinition} from 'sanity'

/**
 * A referenced category, so the client can add one without a deploy. The slug is the stable key
 * (URL filters use it), the title is the label, and `order` sets the display order - or, with
 * `draggable`, the order is set by dragging in the list (the Orderable Document List plugin).
 */
export function defineTaxonomy({
  name,
  title,
  icon,
  description,
  draggable = false,
  fields = [],
}: {
  name: string
  title: string
  icon: DocumentDefinition['icon']
  description: string
  /** Order by dragging in Studio instead of by a number. The list must use orderableDocumentListDeskItem. */
  draggable?: boolean
  /** Settings specific to this taxonomy, after the shared title, slug and order. */
  fields?: FieldDefinition[]
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
      draggable
        ? orderRankField({type: name})
        : defineField({
            name: 'order',
            title: 'Order',
            type: 'number',
            description: 'Lower numbers come first. Ties fall back to the title.',
          }),
      ...fields,
    ],
    orderings: draggable
      ? [orderRankOrdering]
      : [
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
