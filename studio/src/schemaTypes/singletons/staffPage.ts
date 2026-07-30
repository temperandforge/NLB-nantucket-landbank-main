import {CaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Staff Page schema Singleton.  Holds the one-time intro content shown above the Staff grid
 * and department filters - staff members themselves are separate 'staffMember' documents.
 * Singletons are single documents displayed outside the normal collection list, handy for
 * page-level content that only ever has one instance.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const staffPage = defineType({
  name: 'staffPage',
  title: 'Staff Page',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small label above the headline, e.g. "STAFF".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Main page headline, e.g. "Meet our staff".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro paragraph',
      type: 'text',
      description: 'Short intro text shown below the headline, above the filters and grid.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Staff Page',
      }
    },
  },
})
