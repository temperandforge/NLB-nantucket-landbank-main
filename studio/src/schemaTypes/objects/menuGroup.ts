import {defineField, defineType} from 'sanity'
import {FolderIcon} from '@sanity/icons'

/**
 * A non-clickable heading with a submenu beneath it - the footer's column labels
 * ("About Us", "Explore", ...) are these.
 *
 * menuGroup and menuLink are separate types rather than one type with an optional link and
 * optional children, so there is no way to author an ambiguous item (both a link and
 * children, or neither). The Studio shows a type picker when adding to a menu.
 *
 * Nesting is capped at two levels: a group's children are menuLinks, which cannot nest
 * further. That covers the footer and header designs, and Sanity does not model recursive
 * object types cleanly. Deeper nesting would be speculative.
 */

export const menuGroup = defineType({
  name: 'menuGroup',
  title: 'Submenu',
  type: 'object',
  icon: FolderIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Heading',
      type: 'string',
      description: 'Heading shown above the links. Not clickable.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'children',
      title: 'Links',
      type: 'array',
      of: [{type: 'menuLink'}],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: {label: 'label', children: 'children'},
    prepare({label, children}) {
      const count = Array.isArray(children) ? children.length : 0
      return {
        title: label || 'Untitled submenu',
        subtitle: `${count} link${count === 1 ? '' : 's'}`,
      }
    },
  },
})
