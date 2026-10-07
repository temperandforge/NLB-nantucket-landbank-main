import {defineField, defineType} from 'sanity'
import {ChevronUpIcon} from '@sanity/icons'

/**
 * Header schema Singleton - the content of the site-wide header.
 *
 * Lives under Globals in the Studio structure and is edited as one fixed document with id
 * 'header'. The primary navigation is a standalone 'menu' document, referenced rather than
 * inlined (docs/DECISIONS.md 1.1). The logo is a committed asset, not a field.
 */

export const header = defineType({
  name: 'header',
  title: 'Header',
  type: 'document',
  icon: ChevronUpIcon,
  fields: [
    defineField({
      name: 'mainMenu',
      title: 'Main menu',
      type: 'reference',
      to: [{type: 'menu'}],
      description:
        'The primary navigation. A submenu becomes a dropdown; a plain link stays a link. Set a "Column heading" on links to split a dropdown into headed columns.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Header'}
    },
  },
})
