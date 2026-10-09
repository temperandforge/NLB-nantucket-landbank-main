import {LinkIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A stack of link rows inside rich text: each row is a label, a link and an icon. Link shows an
 * arrow; Download shows the download tray (point the link at the file). Figma: Design System
 * "Link item". Rows are 16px apart.
 */
export const anchorLinks = defineType({
  name: 'anchorLinks',
  title: 'Anchor links',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'anchorLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'link', title: 'Link', type: 'link'}),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: [
                  {title: 'Link (arrow)', value: 'link'},
                  {title: 'Download', value: 'download'},
                ],
                layout: 'radio',
              },
              initialValue: 'link',
            }),
          ],
          preview: {
            select: {title: 'label', icon: 'icon'},
            prepare: ({title, icon}) => ({
              title: title || 'Untitled',
              subtitle: icon === 'download' ? 'Download' : 'Link',
            }),
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {links: 'links'},
    prepare: ({links}) => ({
      title: 'Anchor links',
      subtitle: `${links?.length ?? 0} links`,
    }),
  },
})
