import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Single Project Page (singleton, fixed id `singleProjectPage`): what every project page shares,
 * as opposed to one project's own content: the eyebrow and where it links, and the "more
 * projects" section under the page. Mirrors Article Page Settings.
 *
 * Every field is optional: the page falls back to the wording in the design.
 */
export const singleProjectPage = defineType({
  name: 'singleProjectPage',
  title: 'Project Page Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Label above the title',
      type: 'string',
      description: 'The small label at the top of a project page. Default: "Projects".',
    }),
    defineField({
      name: 'archiveLink',
      title: 'Label links to',
      type: 'link',
      description:
        'The Projects page the label links back to. With no link (or one that does not resolve) the label is plain text.',
    }),
    defineField({
      name: 'moreProjects',
      title: 'More projects',
      type: 'object',
      description:
        'The section under a project: other projects (those sharing a project type first, then the newest), never the one being read.',
      fields: [
        defineField({
          name: 'disabled',
          title: 'Hide this section',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          initialValue: 'Projects',
        }),
        defineField({name: 'body', title: 'Body', type: 'text', rows: 6}),
        defineField({
          name: 'button',
          title: 'Button',
          type: 'button',
          description: 'Shown under the text. Leave the label or link empty to hide it.',
        }),
        defineField({
          name: 'count',
          title: 'How many projects',
          type: 'number',
          initialValue: 3,
          validation: (rule) => rule.min(1).max(4).integer(),
        }),
      ],
      initialValue: {disabled: false, eyebrow: 'Projects', count: 3},
    }),
  ],
  preview: {prepare: () => ({title: 'Project Page Settings'})},
})
