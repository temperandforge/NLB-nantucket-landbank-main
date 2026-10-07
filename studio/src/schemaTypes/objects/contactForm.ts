import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock, headingLevelField} from './blockFields'

/**
 * Contact details on the left, a form on the right (Figma: Contact Us). The form is a `form`
 * document, so the same form can be reused. A block with no form shows the left column only.
 * Blocks saved before the form existed have just a heading and keep working.
 */
export const contactForm = defineBlock({
  name: 'contactForm',
  title: 'Contact Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    headingLevelField('h2'),
    defineField({
      name: 'details',
      title: 'Contact details',
      type: 'blockContent',
      description:
        'Shown under the heading: phone, fax, email. Link an email address with a mailto: URL.',
    }),
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'form'}],
      description: 'Build it under Forms. Nothing is shown on the right until one is chosen.',
    }),
  ],
  preview: {
    select: {title: 'heading', form: 'form.title'},
    prepare: ({title, form}) => ({
      title: title || 'No heading yet',
      subtitle: ['Contact Form', form].filter(Boolean).join(' · '),
    }),
  },
})
