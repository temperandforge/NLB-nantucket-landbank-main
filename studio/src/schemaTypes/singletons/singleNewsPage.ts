import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'

/**
 * Single News Page (singleton, fixed id `singleNewsPage`): the content every news article page
 * shares, as opposed to the content of one article: the wording around it and the "more news"
 * section under it. Other singles (events, projects) get their own settings document when they have
 * pages.
 *
 * Every field is optional: the page falls back to the wording in the design.
 */
export const singleNewsPage = defineType({
  name: 'singleNewsPage',
  title: 'News Article Page Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Label above the title',
      type: 'string',
      description: 'The small label at the top of an article. Default: "Nantucket News".',
    }),
    defineField({
      name: 'archiveLink',
      title: 'Label links to',
      type: 'link',
      description:
        'The News page the label links back to. With no link (or one that does not resolve) the label is plain text.',
    }),
    defineField({
      name: 'publishedLabel',
      title: 'Published label',
      type: 'string',
      description: 'Shown before the date, e.g. "Published:". Default: "Published:".',
    }),
    defineField({
      name: 'shareLabel',
      title: 'Share label',
      type: 'string',
      description: 'The heading of the share buttons. Default: "Share".',
    }),
    imageWithAltField({
      name: 'fallbackImage',
      title: 'Fallback image',
      description:
        'Shown on the news tile and in the social preview of an article that has no image of its own. Leave empty to show no image for those articles.',
    }),
    defineField({
      name: 'moreNews',
      title: 'More news',
      type: 'newsPreview',
      description:
        'The section under an article: the latest articles in the same category (topped up with the latest others), never the one being read. Turn on "Hide this block" in its settings to remove the section.',
      initialValue: {
        heading: 'Nantucket News',
        count: 3,
        // No call to action until the news archive exists, so there is nothing for it to link to.
        ctaHeading: '',
        ctaLabel: '',
      },
    }),
  ],
  preview: {prepare: () => ({title: 'News Article Page Settings'})},
})
