import {PinIcon} from '@sanity/icons'
import {defineArrayMember, defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * A short preview of a few hand-picked properties (Figma: Properties Preview): a heading and a
 * button above up to three property cards. The properties are references, so a property's name,
 * image and tags are edited once, on the property. Distinct from Property Archive, which lists
 * every property with filters.
 */
export const propertiesPreview = defineBlock({
  name: 'propertiesPreview',
  title: 'Properties Preview',
  type: 'object',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'We have properties for every type of recreation',
    }),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'button',
      description: 'Shown beside the heading. Leave the label or link empty to hide it.',
    }),
    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      description: 'Shown in order, three across. Up to three.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'property'}]})],
      validation: (rule) => rule.max(3),
    }),
  ],
  preview: {
    select: {title: 'heading', properties: 'properties'},
    prepare: ({title, properties}) => ({
      title: title || 'Untitled',
      subtitle: `Properties Preview · ${properties?.length ?? 0} properties`,
    }),
  },
})
