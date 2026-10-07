import {CaseIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, eyebrowField} from './blockFields'

/**
 * Every job opening, in each job's Order. They come from the Jobs list, so the block holds only
 * its heading. With no openings the block is not shown.
 */
export const jobListings = defineBlock({
  name: 'jobListings',
  title: 'Job Listings',
  type: 'object',
  icon: CaseIcon,
  fields: [
    {...eyebrowField(), initialValue: 'Job openings'},
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Join the Team'}),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Job Listings'}),
  },
})
