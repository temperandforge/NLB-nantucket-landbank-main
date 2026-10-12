import {ProjectsIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A Land Bank project - an initiative the Land Bank is carrying out, shown by the Project Grid,
 * Project Preview and Image Carousel blocks. Distinct from `property`, which is a parcel on the
 * interactive map; a project can point at the property it happens on.
 */
export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  icon: ProjectsIcon,
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
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Important for accessibility and SEO.',
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description:
        'Optional. Where the project’s card links to. Accepts a path on this site, or # as a placeholder.',
      // allowRelative because these are site-relative paths, and # is the placeholder convention.
      validation: (Rule) => Rule.uri({allowRelative: true, scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'projectTypes',
      title: 'Project types',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'projectType'}]})],
      description: 'What kind of project this is. Drives the Project Grid tabs and the Image Carousel category.',
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      to: [{type: 'property'}],
      description: 'Optional. The Land Bank property this project takes place on.',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'description', media: 'image'},
  },
})
