import {DocumentsIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * Every record, under a tab per record category. Which filters a tab shows and how its list is
 * ordered are set on the category, not here, so the block has nothing to configure.
 */
export const recordsArchive = defineBlock({
  name: 'recordsArchive',
  title: 'Records Archive',
  type: 'object',
  icon: DocumentsIcon,
  fields: [],
  preview: {
    prepare: () => ({title: 'Records Archive', subtitle: 'Every public record, by category'}),
  },
})
