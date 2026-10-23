import {DocumentsIcon, HelpCircleIcon, TagIcon, UsersIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineTaxonomy} from './taxonomy'

export const newsCategory = defineTaxonomy({
  name: 'newsCategory',
  title: 'News Category',
  icon: TagIcon,
  description: 'Shown on news items, e.g. "Conservation".',
})

export const department = defineTaxonomy({
  name: 'department',
  title: 'Department',
  icon: UsersIcon,
  description: 'Groups staff, e.g. "Property Management".',
})

export const faqCategory = defineTaxonomy({
  name: 'faqCategory',
  title: 'FAQ Category',
  icon: HelpCircleIcon,
  description: 'Groups FAQs under a heading, e.g. "Form Filing".',
  draggable: true,
})

export const recordCategory = defineTaxonomy({
  name: 'recordCategory',
  title: 'Record Category',
  icon: DocumentsIcon,
  description: 'A tab on the Public Records page, e.g. "Meeting Minutes".',
  fields: [
    defineField({
      name: 'sortBy',
      title: 'Order the list by',
      type: 'string',
      options: {
        list: [
          {title: 'Date, newest first', value: 'dateDesc'},
          {title: 'Title, A to Z', value: 'titleAsc'},
        ],
        layout: 'radio',
      },
      initialValue: 'dateDesc',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'filters',
      title: 'Filters',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      // The allowed keys are the keys of RECORD_FILTERS in frontend/sanity/lib/archiveFilter.ts:
      // one list in two packages, so change them together.
      options: {list: [{title: 'Year', value: 'year'}]},
      validation: (rule) => rule.unique(),
      description:
        'Filters shown above this tab’s list. Year offers the years the records have, so give those records a date.',
    }),
  ],
})
