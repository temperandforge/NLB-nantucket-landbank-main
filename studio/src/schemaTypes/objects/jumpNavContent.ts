import {ThListIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, headingLevelField} from './blockFields'
import {jumpNavBodyMembers} from './jumpNavBody'

/**
 * A heading with a sticky section nav on the left and long-form content on the right. The nav is
 * not authored: it is built from the content's H2 headings, so editors maintain the content once.
 * H1 is not offered in the content because the block's own heading is the page-level heading,
 * and H2 must unambiguously mean "a section of the nav". Use H3 and below inside a section.
 */
export const jumpNavContent = defineBlock({
  name: 'jumpNavContent',
  title: 'Jump Nav Content',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h1'),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      description: 'Each “Section heading (H2)” becomes a link in the left-hand nav.',
      of: jumpNavBodyMembers,
    }),
  ],
  preview: {
    select: {title: 'heading', content: 'content'},
    prepare: ({title, content}) => {
      // With no heading of its own, show the first section heading, which is what the nav starts with.
      const firstSection = (content as Array<{style?: string; children?: Array<{text?: string}>}> | undefined)
        ?.find((block) => block.style === 'h2')
        ?.children?.map((child) => child.text ?? '')
        .join('')
        .trim()
      return {title: title || firstSection || 'No heading yet', subtitle: 'Jump Nav Content'}
    },
  },
})
