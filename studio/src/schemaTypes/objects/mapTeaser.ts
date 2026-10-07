import {PinIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A short teaser for the interactive map. The preview area is a placeholder, as in the theme; a
 * live preview is tracked as deferred work.
 */
export const mapTeaser = defineType({
  name: 'mapTeaser',
  title: 'Map Teaser',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Map Teaser', subtitle: 'Map Teaser'}),
  },
})
