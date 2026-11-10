import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

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
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Label above the title',
      type: 'string',
      description: 'The small label at the top of an event page. Default: "Events".',
    }),
    defineField({
      name: 'archiveLink',
      title: 'Label links to',
      type: 'link',
      description:
        'The Events page the label links back to. With no link (or one that does not resolve) the label is plain text.',
    }),
  ],
  preview: {prepare: () => ({title: 'Event Page Settings'})},
})
