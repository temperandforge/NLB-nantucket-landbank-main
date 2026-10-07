import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** Every Land Bank property (the map's projects) as a card. They come from Projects. */
export const projectGrid = defineBlock({
  name: 'projectGrid',
  title: 'Project Grid',
  type: 'object',
  icon: PinIcon,
  fields: [defineField({name: 'heading', title: 'Heading', type: 'string'})],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Project Grid'}),
  },
})
