import {PinIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'

/**
 * A short, numbered preview of a few projects, hand-picked or the latest in a category (Figma: Project Preview): an intro panel
 * with text and a button, then each project as a numbered column. The projects are references, so
 * a project's name and image are edited once, on the project. Distinct from Project Grid, which
 * lists every property.
 */
export const projectPreview = defineBlock({
  name: 'projectPreview',
  title: 'Project Preview',
  type: 'object',
  icon: PinIcon,
  fields: [
    eyebrowField(),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 6}),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      description: 'Shown under the text. Leave the label or link empty to hide it.',
    }),
    defineField({
      name: 'source',
      title: 'Projects shown',
      type: 'string',
      options: {
        list: [
          {title: 'Hand-picked projects', value: 'manual'},
          {title: 'Latest projects in a category', value: 'category'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
    }),
    defineField({
      name: 'projects',
      title: 'Projects',
      type: 'array',
      description: 'Shown in order, numbered 01, 02, 03. Up to three.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      hidden: ({parent}) => parent?.source === 'category',
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'projectType'}],
      description:
        'The three most recently created projects in this category are shown, newest first. New projects added to it appear automatically.',
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
          ? `Project Preview · ${category ?? 'no category'}`
          : `Project Preview · ${projects?.length ?? 0} projects`,
    }),
  },
})
