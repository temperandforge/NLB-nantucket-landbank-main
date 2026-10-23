import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A kind of project - the category projects are grouped and filtered by.
 *
 * A document rather than a hardcoded list so the client can add a category without a deploy.
 * Projects reference these; Project Grid tabs and the Image Carousel's category option use them.
 */
export const projectType = defineType({
  name: 'projectType',
  title: 'Project Type',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown to visitors, e.g. "Habitat Restoration".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in the Project Grid filter URL (?type=restoration). Changing it breaks any shared or bookmarked filter link, so prefer editing the title.',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    // Set by dragging in the Project Types list, not edited here.
    orderRankField({type: 'projectType'}),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {title: 'title', slug: 'slug.current'},
    prepare({title, slug}) {
      return {title: title || 'Untitled', subtitle: slug}
    },
  },
})
