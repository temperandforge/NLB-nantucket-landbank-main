import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'

/**
 * Site banner Singleton - the dismissible bar above the header.
 *
 * Edited as one fixed document with id 'siteBanner' under Globals. When 'enabled' is off nothing
 * renders. A visitor's dismissal is remembered against the message text, so editing the message
 * shows the banner again.
 */

export const siteBanner = defineType({
  name: 'siteBanner',
  title: 'Site banner',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show banner',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
      description: 'One line of plain text, e.g. "Welcome to the new website".',
      validation: (Rule) =>
        Rule.custom((message, context) => {
          const enabled = (context.document as {enabled?: boolean} | undefined)?.enabled
          return enabled && !message?.trim() ? 'Required while the banner is shown' : true
        }),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Optional. When set, the message becomes a link.',
    }),
  ],
  preview: {
    select: {enabled: 'enabled', message: 'message'},
    prepare({enabled, message}) {
      return {title: 'Site banner', subtitle: `${enabled ? 'Shown' : 'Hidden'}${message ? ` - ${message}` : ''}`}
    },
  },
})
