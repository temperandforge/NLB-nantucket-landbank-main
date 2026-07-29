import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

/**
 * Page schema.  Define and edit the fields for the 'page' content type.
 * Learn more: https://www.sanity.io/docs/studio/schema-types
 */

export const page = defineType({
  name: 'page',
  title: 'Flexible Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'The page path, without a leading slash. May include slashes to nest a page under a section, e.g. "about-us/conservation" - the parent segment does not need a page of its own.',
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          const current = slug?.current
          if (!current) return true
          // Lowercase words separated by single hyphens, in one or more slash-separated
          // segments. Rejects leading/trailing slashes, empty segments, and uppercase or
          // otherwise URL-unsafe characters, any of which would produce a broken route.
          const isValid = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(current)
          return (
            isValid ||
            'Use lowercase letters, numbers and hyphens, with "/" to separate path segments. No leading or trailing slash.'
          )
        }),
      options: {
        source: 'name',
        maxLength: 96,
        // The default slugifier strips "/", which would make nested paths unauthorable. This
        // keeps slashes so a path can be typed or pasted directly, and collapses the runs of
        // separators that produce empty segments.
        slugify: (input) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9/\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '')
            .slice(0, 96),
      },
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page builder',
      type: 'array',
      of: [{type: 'callToAction'}, {type: 'infoSection'}],
      options: {
        insertMenu: {
          // Configure the "Add Item" menu to display a thumbnail preview of the content type. https://www.sanity.io/docs/studio/array-type#efb1fe03459d
          views: [
            {
              name: 'grid',
              previewImageUrl: (schemaTypeName) =>
                `/static/page-builder-thumbnails/${schemaTypeName}.webp`,
            },
          ],
        },
      },
    }),
  ],
})
