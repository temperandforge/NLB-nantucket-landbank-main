import {EarthGlobeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A third-party page shown in an iframe inside rich text (a Google Map or Calendar). Only the
 * addresses below are accepted. The frontend's `embedSrc` (frontend/sanity/lib/embed.ts) applies
 * the same check at render and cannot share code with this file, so change both together.
 */
const ALLOWED: Array<{host: string; pathPrefix: string}> = [
  {host: 'maps.google.com', pathPrefix: '/maps'},
  {host: 'www.google.com', pathPrefix: '/maps'},
  {host: 'calendar.google.com', pathPrefix: '/calendar/embed'},
]

const isAllowed = (value: string) => {
  const url = new URL(value)
  return (
    url.protocol === 'https:' &&
    ALLOWED.some(({host, pathPrefix}) => url.hostname === host && url.pathname.startsWith(pathPrefix))
  )
}

export const embed = defineType({
  name: 'embed',
  title: 'Embed',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Embed address',
      type: 'url',
      description:
        'A Google Map or Google Calendar. In Google, choose Share, then Embed a map, and paste only the address inside src="…", not the whole snippet.',
      validation: (rule) =>
        rule
          .required()
          .uri({scheme: ['https']})
          .custom((value) => {
            if (!value) return true
            try {
              return isAllowed(value) ? true : 'Use an embed address from Google Maps or Google Calendar'
            } catch {
              return true
            }
          }),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'What the embed shows, e.g. “Map of the garden”. Read out by screen readers.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shape',
      title: 'Shape',
      type: 'string',
      options: {
        list: [
          {title: 'Wide (16:9)', value: 'wide'},
          {title: 'Standard (4:3)', value: 'standard'},
          {title: 'Square', value: 'square'},
        ],
        layout: 'radio',
      },
      initialValue: 'wide',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional. Shown under the embed.',
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'url'},
    prepare: ({title, subtitle}) => ({title: title || 'Embed', subtitle}),
  },
})
