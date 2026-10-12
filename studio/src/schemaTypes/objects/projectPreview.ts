import {PinIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'

/**
 * A short, numbered preview of a few hand-picked projects (Figma: Project Preview): an intro panel
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
      name: 'projects',
      title: 'Projects',
      type: 'array',
      description: 'Shown in order, numbered 01, 02, 03. Up to four.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      validation: (rule) => rule.max(4),
    }),
  ],
  preview: {
    select: {title: 'eyebrow', projects: 'projects'},
    prepare: ({title, projects}) => ({
      title: title || 'Untitled',
      subtitle: `Project Preview · ${projects?.length ?? 0} projects`,
    }),
  },
})
