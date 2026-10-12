import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A preview of the interactive map (Figma: Map Preview): a heading and intro above the live map,
 * showing every property, boundary and trail from Project Settings. Distinct from Interactive Map,
 * which is a static illustration with one featured property.
 */
export const mapPreview = defineBlock({
  name: 'mapPreview',
  title: 'Map Preview',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Nantucket Trails and Properties',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'No heading yet', subtitle: 'Map Preview'}),
  },
})
