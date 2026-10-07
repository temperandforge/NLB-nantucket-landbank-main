import {defineArrayMember, defineType} from 'sanity'

import {blockContentMembers} from './blockContent'

/**
 * Standard rich text plus an embeddable form. Only the Basic Left Right Text right column uses it,
 * so editors are not offered a form in every rich-text field.
 */
export const blockContentWithForm = defineType({
  title: 'Block Content (with form)',
  name: 'blockContentWithForm',
  type: 'array',
  of: [...blockContentMembers, defineArrayMember({type: 'formEmbed'})],
})
