import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A centred call to action over a photo and line art. The photos are decorative, so they have no
 * alt text field and are rendered with empty alt.
 */
export const ctaContact = defineBlock({
  name: 'ctaContact',
  title: 'CTA Contact',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Contact Us'}),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'text',
      rows: 3,
      initialValue:
        'Have a question, need more information, or not sure where to start? Reach out—we’re here to help connect you with the answers and resources you need.',
    }),
    defineField({name: 'button', title: 'Button', type: 'button'}),
    defineField({
      name: 'desktopImage',
      title: 'Background image (desktop)',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'mobileImage',
      title: 'Background image (mobile)',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'heading', media: 'desktopImage'},
    prepare: ({title, media}) => ({title: title || 'Untitled', subtitle: 'CTA Contact', media}),
  },
})
