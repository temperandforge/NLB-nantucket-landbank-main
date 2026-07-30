import {CaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Staff member schema.  Define and edit the fields for the 'staffMember' content type.
 * Staff appear only as cards on the Staff index page, filtered by department - there are
 * no individual profile pages, so no slug or SEO fields are needed.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const staffMember = defineType({
  name: 'staffMember',
  title: 'Staff Member',
  icon: CaseIcon,
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
      description: 'Optional - the card design supports staff without a photo.',
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
      name: 'jobTitle',
      title: 'Job title',
      type: 'string',
      description:
        'Free text, so credentials can be included where needed, e.g. "PhD, Director of Environmental and Agricultural Resources".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
      description:
        'Managed under People > Staff Departments. Renaming a department there updates it on every staff card at once.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      description:
        'Position on the Staff page - lowest number first, regardless of department. Leave gaps (10, 20, 30) so someone can be inserted later without renumbering everyone.',
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
    {
      title: 'Name',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      name: 'name',
      jobTitle: 'jobTitle',
      department: 'department->title',
      picture: 'picture',
    },
    prepare({name, jobTitle, department, picture}) {
      const subtitles = [jobTitle, department].filter(Boolean)

      return {
        title: name,
        subtitle: subtitles.join(' - '),
        media: picture,
      }
    },
  },
})
