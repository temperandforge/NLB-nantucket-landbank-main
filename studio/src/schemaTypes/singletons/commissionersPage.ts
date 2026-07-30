import {UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Commissioners Page schema Singleton.  Holds the one-time intro content shown above the
 * Commissioners grid - the commissioners themselves are separate 'commissioner' documents.
 * Singletons are single documents displayed outside the normal collection list, handy for
 * page-level content that only ever has one instance.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const commissionersPage = defineType({
  name: 'commissionersPage',
  title: 'Commissioners Page',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small label above the headline, e.g. "COMMISSIONERS".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Main page headline, e.g. "Meet our commissioners".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro paragraph',
      type: 'text',
      description: 'Short intro text shown below the headline, above the grid.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Commissioners Page',
      }
    },
  },
})
