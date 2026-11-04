import {ImagesIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'
import {galleryEntryMembers} from './galleryEntries'

type Parent = {source?: string} | undefined

/**
 * The Image Carousel (Figma: Image Carousel): a row of cards, one centred, under an eyebrow tag.
 * The cards come from one of three sources, all drawn the same way as a property's gallery
 * (DECISIONS 26, 27):
 *  - `manual`: a hand-picked list of uploaded images and related news, projects, properties and
 *    events;
 *  - `projectCategory`: every project in a category, A to Z;
 *  - `newsCategory`: the latest news in a category, newest first, up to `limit`.
 * Documents are references, so name and image are edited once, on the document.
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
      title: 'Cards shown',
      type: 'string',
      options: {
        list: [
          {title: 'Hand-picked', value: 'manual'},
          {title: 'All projects in a category', value: 'projectCategory'},
          {title: 'Latest news in a category', value: 'newsCategory'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
    }),
    defineField({
      name: 'gallery',
      title: 'Cards',
      type: 'array',
      description:
        'Shown in order. Add an uploaded image (it opens full size when clicked) or a related news article, project, property or event (the card uses that document’s image and title and links to its page). A related document with no image is not shown, so give it one. Leave empty to hide the carousel.',
      of: galleryEntryMembers(),
      hidden: ({parent}: {parent?: Parent}) => parent?.source === 'projectCategory' || parent?.source === 'newsCategory',
    }),
    defineField({
      name: 'category',
      title: 'Project category',
      type: 'reference',
      to: [{type: 'projectType'}],
      description:
        'Every project in this category is shown, A to Z. New projects added to it appear automatically.',
      hidden: ({parent}) => parent?.source !== 'projectCategory',
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.parent as Parent)?.source === 'projectCategory' && !value
            ? 'Choose a category'
            : true,
        ),
    }),
    defineField({
      name: 'newsCategory',
      title: 'News category',
      type: 'reference',
      to: [{type: 'newsCategory'}],
      description:
        'The latest news in this category is shown, newest first. New articles added to it appear automatically. An article with no image is not shown.',
      hidden: ({parent}) => parent?.source !== 'newsCategory',
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.parent as Parent)?.source === 'newsCategory' && !value
            ? 'Choose a news category'
            : true,
        ),
    }),
    defineField({
      name: 'limit',
      title: 'Show latest',
      type: 'number',
      description: 'How many articles to show, 1 to 20. Default 8.',
      initialValue: 8,
      validation: (rule) => rule.min(1).max(20).integer(),
      hidden: ({parent}) => parent?.source !== 'newsCategory',
    }),
  ],
  preview: {
    select: {
      title: 'eyebrow',
      source: 'source',
      gallery: 'gallery',
      category: 'category.title',
      newsCategory: 'newsCategory.title',
      limit: 'limit',
    },
    prepare: ({title, source, gallery, category, newsCategory, limit}) => ({
      title: title || 'Untitled',
      subtitle:
        source === 'projectCategory'
          ? `Image Carousel · ${category ?? 'no category'}`
          : source === 'newsCategory'
            ? `Image Carousel · News: ${newsCategory ?? 'no category'}, latest ${limit ?? 8}`
            : `Image Carousel · ${gallery?.length ?? 0} entries`,
    }),
  },
})
