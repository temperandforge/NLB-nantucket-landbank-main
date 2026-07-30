import {defineField, defineType} from 'sanity'
import {MenuIcon} from '@sanity/icons'

/**
 * A reusable, nestable navigation menu.
 *
 * Menus are standalone documents referenced by whatever renders them rather than inline
 * arrays on a single document, so adding the header menu later means creating another 'menu'
 * document and referencing it - no schema change, and no duplicated item schema.
 *
 * Items are either a menuGroup (a heading with a submenu) or a menuLink (a direct link).
 */

export const menu = defineType({
  name: 'menu',
  title: 'Menu',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Internal name, e.g. "Footer Menu". Never shown on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{type: 'menuGroup'}, {type: 'menuLink'}],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', items: 'items'},
    prepare({title, items}) {
      const count = Array.isArray(items) ? items.length : 0
      return {
        title: title || 'Untitled menu',
        subtitle: `${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
