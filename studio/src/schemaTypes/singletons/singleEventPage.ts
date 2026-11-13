import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'

/**
 * Single Event Page (singleton, fixed id `singleEventPage`): what every event page shares, as
 * opposed to one event's own content: the label above the title and where it links back. Mirrors
 * Project Page Settings.
 *
 * Every field is optional: the page falls back to "Events" as plain text.
 */
export const singleEventPage = defineType({
  name: 'singleEventPage',
  title: 'Event Page Settings',
  type: 'document',
  icon: CogIcon,
  groups: [{name: 'singleEvent', title: 'Single', default: true}],
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Label above the title',
      type: 'string',
      group: 'singleEvent',
      description: 'The small label at the top of an event page. Default: "Events".',
    }),
    defineField({
      name: 'archiveLink',
      title: 'Label links to',
      type: 'link',
      group: 'singleEvent',
      description:
        'The Events page the label links back to. With no link (or one that does not resolve) the label is plain text.',
    }),
    {
      ...imageWithAltField({
        name: 'fallbackImage',
        title: 'Fallback image',
        description:
          'Shown on the tile, the page and the social preview of an event that has no image of its own. Leave empty to show no image for those events.',
      }),
      group: 'singleEvent',
    },
  ],
  preview: {prepare: () => ({title: 'Event Page Settings'})},
})
