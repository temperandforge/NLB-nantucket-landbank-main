import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A contact form. Submissions are not built yet (the theme used Gravity Forms, which has no
 * equivalent here), so the site shows a placeholder where the form will go. Tracked as deferred
 * work.
 */
export const contactForm = defineBlock({
  name: 'contactForm',
  title: 'Contact Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'The form itself is not available yet; visitors see a short notice instead.',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Contact Form'}),
  },
})
