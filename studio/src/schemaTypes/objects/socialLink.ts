import {defineField, defineType} from 'sanity'

/**
 * A social profile link in the footer's bottom band.
 *
 * A platform enum plus URL rather than fixed per-platform fields, so the organization can add
 * or drop a network without a schema change. The frontend maps platform -> icon component.
 *
 * Only facebook, instagram and linkedin ship with icons (the three in the design). Selecting
 * x or youtube renders nothing until an icon is added in frontend/components/icons.
 */

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social Link',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: {
        list: [
          {title: 'Facebook', value: 'facebook'},
          {title: 'Instagram', value: 'instagram'},
          {title: 'LinkedIn', value: 'linkedin'},
          {title: 'X', value: 'x'},
          {title: 'YouTube', value: 'youtube'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Profile URL',
      type: 'url',
      description:
        'The full URL of the profile, e.g. https://www.facebook.com/example. Seeded as # until the real profile URLs are supplied.',
      // allowRelative so # works as a placeholder; the real values are absolute URLs.
      validation: (Rule) =>
        Rule.uri({allowRelative: true, scheme: ['http', 'https']}).required(),
    }),
  ],
  preview: {
    select: {title: 'platform', subtitle: 'url'},
  },
})
