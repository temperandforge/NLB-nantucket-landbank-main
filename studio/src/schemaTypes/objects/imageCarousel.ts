import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'

/**
 * A horizontally scrolling row of hand-picked projects (Figma: Image Carousel). The eyebrow
 * shows as a tag above the row. Each project is a card with its image; on hover or focus it opens
 * into a green card showing the project name and an arrow, and links to the project's link.
 * Projects are either hand-picked or every project in a category. They are references, so name,
 * image and link are edited once, on the project.
 */
export const imageCarousel = defineBlock({
  name: 'imageCarousel',
  title: 'Image Carousel',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    eyebrowField(),
    defineField({
      name: 'source',
      title: 'Projects shown',
      type: 'string',
      options: {
        list: [
          {title: 'Hand-picked projects', value: 'manual'},
          {title: 'All projects in a category', value: 'category'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
    }),
    defineField({
      name: 'projects',
      title: 'Projects',
      type: 'array',
      description:
        'Shown in order. Each card uses the project’s image and name, and links to its "Find out more" link. Edit those on the project.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      hidden: ({parent}) => parent?.source === 'category',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'projectType'}],
      description:
        'Every project in this category is shown, A to Z. New projects added to it appear automatically.',
      hidden: ({parent}) => parent?.source !== 'category',
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.parent as {source?: string} | undefined)?.source === 'category' && !value
            ? 'Choose a category'
            : true,
        ),
    }),
  ],
  preview: {
    select: {title: 'eyebrow', source: 'source', projects: 'projects', category: 'category.title'},
    prepare: ({title, source, projects, category}) => ({
      title: title || 'Untitled',
      subtitle:
        source === 'category'
          ? `Image Carousel · ${category ?? 'no category'}`
          : `Image Carousel · ${projects?.length ?? 0} projects`,
    }),
  },
})
