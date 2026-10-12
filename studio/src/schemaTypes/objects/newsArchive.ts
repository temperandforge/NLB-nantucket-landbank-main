import {DocumentsIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** Every news article as a card, newest first, three across. They come from the News Articles list. */
export const newsArchive = defineBlock({
  name: 'newsArchive',
  title: 'News Archive',
  type: 'object',
  icon: DocumentsIcon,
  fields: [
    defineField({
      name: 'showFilters',
      title: 'Show category tabs',
      type: 'boolean',
      initialValue: true,
      description:
        'Adds an All tab and a tab per news category above the articles. The chosen category is kept in the address, so a filtered view can be shared.',
    }),
  ],
  preview: {
    prepare: () => ({title: 'News Archive', subtitle: 'Every news article'}),
  },
})
