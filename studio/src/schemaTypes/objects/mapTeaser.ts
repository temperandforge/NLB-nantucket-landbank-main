import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A teaser for the interactive map (Figma: Interactive Map Block): a brown panel with text, and a
 * map panel with a static illustration, a pin and a card for one featured property. The map is
 * artwork, not a live map.
 */
export const mapTeaser = defineBlock({
  name: 'mapTeaser',
  title: 'Map Teaser',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      initialValue: 'Our interactive map',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Find properties, explore the island.',
    }),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    defineField({
      name: 'featuredProject',
      title: 'Featured property',
      type: 'reference',
      to: [{type: 'property'}],
      description: 'Fills the detail card on the map. Leave empty to hide the card.',
    }),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      initialValue: {
        buttonText: 'View the map',
        link: {_type: 'link', linkType: 'href', href: '/map'},
      },
    }),
  ],
  preview: {
    select: {title: 'heading', eyebrow: 'eyebrow'},
    prepare: ({title, eyebrow}) => ({title: title || eyebrow || 'No heading yet', subtitle: 'Map Teaser'}),
  },
})
