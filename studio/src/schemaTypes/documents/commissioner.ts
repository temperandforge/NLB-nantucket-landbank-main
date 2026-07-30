import {UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Commissioner schema.  Define and edit the fields for the 'commissioner' content type.
 * Commissioners appear only as cards on the Commissioners index page - there are no
 * individual profile pages, so no slug or SEO fields are needed.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const commissioner = defineType({
  name: 'commissioner',
  title: 'Commissioner',
  icon: UsersIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Full name as it should appear on the site, including any middle initial.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'picture',
      title: 'Picture',
      type: 'image',
      description: 'Optional - the card design supports commissioners without a photo.',
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              const document = context.document as {picture?: {asset?: {_ref?: string}}}
              if (document?.picture?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        }),
      ],
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description:
        'Office held, written exactly as it should read on the card. Combined roles can be typed out in full, e.g. "Vice Secretary / Vice Treasurer".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'termEndDate',
      title: 'Term end date',
      type: 'date',
      description:
        'The date this seat expires. The site displays month and year only, e.g. "May 2027".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description:
        'Position on the Commissioners page - lowest number first. Leave gaps (10, 20, 30) so someone can be inserted later without renumbering everyone.',
      validation: (rule) => rule.required().integer().positive(),
    }),
  ],
  // Sort the Studio list the same way the website orders the page. https://www.sanity.io/docs/sort-orders
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
      name: 'name',
      role: 'role',
      picture: 'picture',
    },
    prepare({name, role, picture}) {
      return {
        title: name,
        subtitle: role,
        media: picture,
      }
    },
  },
})
