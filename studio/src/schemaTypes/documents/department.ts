import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Department schema.  Define and edit the fields for the 'department' content type.
 * Departments group staff members and drive the filter buttons on the Staff page.  They live
 * in their own collection so the Land Bank team can rename, reorder, and add departments
 * without a code change - renaming one updates every staff card that references it.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const department = defineType({
  name: 'department',
  title: 'Staff Department',
  icon: TagIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Shown on staff cards and as a filter button, e.g. "Environmental & Agricultural".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'A URL-safe version of the title, generated from it. Lets a filtered Staff page be linked to directly.',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description:
        'Order of the filter buttons on the Staff page - lowest number first. Leave gaps (10, 20, 30) so a department can be inserted later without renumbering everything.',
      validation: (rule) => rule.required().integer().positive(),
    }),
  ],
  // Sort the Studio list the same way the website orders the filter buttons. https://www.sanity.io/docs/sort-orders
  orderings: [
    {
      title: 'Display order',
      name: 'displayOrderAsc',
      by: [{field: 'displayOrder', direction: 'asc'}],
    },
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      title: 'title',
      displayOrder: 'displayOrder',
    },
    prepare({title, displayOrder}) {
      return {
        title,
        subtitle: displayOrder ? `Position ${displayOrder}` : undefined,
      }
    },
  },
})
