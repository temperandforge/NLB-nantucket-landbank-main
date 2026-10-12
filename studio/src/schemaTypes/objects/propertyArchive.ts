import {PinIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * Every Land Bank property as a card, with Property Type and Resources filters above them (the
 * Properties archive). It has no fields of its own: the properties come from Properties, the
 * filter options from the types and resources they use, and the fallback image from Site Settings.
 */
export const propertyArchive = defineBlock({
  name: 'propertyArchive',
  title: 'Property Archive',
  type: 'object',
  icon: PinIcon,
  fields: [],
  preview: {
    select: {},
    prepare: () => ({title: 'Property Archive', subtitle: 'Every property, with filters'}),
  },
})
