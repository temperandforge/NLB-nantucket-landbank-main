import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Single Page Settings (singleton, fixed id `singleSettings`): the content every "single" template
 * shares, as opposed to the content of one article. Today that is the news article page; the other
 * singles (events, projects) get their own section here when they have pages.
 *
 * Every field is optional: the page falls back to the wording in the design.
 */
export const singleSettings = defineType({
  name: 'singleSettings',
  title: 'Single Page Settings',
  type: 'document',
  icon: CogIcon,
  groups: [{name: 'article', title: 'News article', default: true}],
  fields: [
    defineField({
      name: 'articleEyebrow',
      title: 'Label above the title',
      type: 'string',
      group: 'article',
      description: 'The small label at the top of an article. Default: "Nantucket News".',
    }),
    defineField({
      name: 'articlePublishedLabel',
      title: 'Published label',
      type: 'string',
      group: 'article',
      description: 'Shown before the date, e.g. "Published:". Default: "Published:".',
    }),
    defineField({
      name: 'articleShareLabel',
      title: 'Share label',
      type: 'string',
      group: 'article',
      description: 'The heading of the share buttons. Default: "Share".',
    }),
    defineField({
      name: 'articleMoreNews',
      title: 'More news',
      type: 'newsPreview',
      group: 'article',
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
  preview: {prepare: () => ({title: 'Single Page Settings'})},
})
