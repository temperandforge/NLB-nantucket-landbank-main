import {HelpCircleIcon, TagIcon, UsersIcon} from '@sanity/icons'

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
})
