import {defineArrayMember} from 'sanity'

import {altTextField} from './blockFields'

/**
 * The rich text behind a jump nav, shared by Jump Nav Content and the project page so the two
 * cannot drift. Each "Section heading (H2)" becomes a nav link; H1 is not offered because the
 * page's own heading is the H1, and H2 must unambiguously mean "a section of the nav".
 */
export const jumpNavBodyMembers = [
  defineArrayMember({
    type: 'block',
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'Section heading (H2)', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'H4', value: 'h4'},
      {title: 'H5', value: 'h5'},
      {title: 'H6', value: 'h6'},
    ],
    lists: [
      {title: 'Bullet', value: 'bullet'},
      {title: 'Numbered', value: 'number'},
    ],
    marks: {annotations: [{type: 'link'}]},
  }),
  defineArrayMember({type: 'image', options: {hotspot: true}, fields: [altTextField()]}),
  defineArrayMember({type: 'anchorLinks'}),
  defineArrayMember({type: 'faqAccordion'}),
]
