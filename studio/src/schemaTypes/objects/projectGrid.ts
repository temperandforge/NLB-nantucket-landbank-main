import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** Every Land Bank property (the map's projects) as a card, two across. They come from Projects. */
export const projectGrid = defineBlock({
  name: 'projectGrid',
  title: 'Project Grid',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({
      name: 'showFilters',
      title: 'Show type tabs',
      type: 'boolean',
      initialValue: false,
      description:
        'Adds an All tab and a tab per property type above the projects. The chosen type is kept in the address, so a filtered view can be shared.',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Project Grid'}),
  },
})
