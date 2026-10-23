import {ProjectsIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {jumpNavBodyMembers} from '../objects/jumpNavBody'
import {seoField} from '../objects/seo'

/**
 * A Land Bank project - an initiative the Land Bank is carrying out, shown by the Project Grid,
 * Project Preview and Image Carousel blocks. Distinct from `property`, which is a parcel on the
 * interactive map; a project can point at the property it happens on. Each project has a page of
 * its own at /projects/<slug>; its address is derived from the slug, so it has no link field.
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
      name: 'projectTypes',
      title: 'Project types',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'projectType'}]})],
      description: 'What kind of project this is. Drives the Project Grid tabs and the Image Carousel category.',
    }),
    defineField({
      name: 'body',
      title: 'Page content',
      type: 'array',
      of: jumpNavBodyMembers,
      description:
        'The project page. Each “Section heading (H2)” becomes a link in the page’s left-hand nav. Add an FAQ accordion block for questions and answers; put a Section heading above it to introduce it. Leave empty for a page with just the title and image.',
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      to: [{type: 'property'}],
      description: 'Optional. The Land Bank property this project takes place on.',
    }),
    seoField(),
  ],
  preview: {
    select: {title: 'name', subtitle: 'description', media: 'image'},
  },
})
