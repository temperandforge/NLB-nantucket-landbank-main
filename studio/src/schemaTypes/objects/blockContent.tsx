import {defineArrayMember, defineType, defineField} from 'sanity'
import type {Link} from '../../../sanity.types'
import {altTextField} from './blockFields'

/**
 * This is the schema definition for the rich text fields used for
 * for this blog studio. When you import it in schemas.js it can be
 * reused in other parts of the studio with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 *
 * Learn more: https://www.sanity.io/docs/block-content
 */
/**
 * The members of the rich text. No H1: a page's main heading belongs to the block's own heading
 * field. H3 is the top level by default; `h2` adds Heading 2 for a field that stands in for a page
 * section, such as a property's About text, where the editor writes the section heading.
 */
export function blockContentMembers({h2 = false}: {h2?: boolean} = {}) {
  return [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        ...(h2 ? [{title: 'Heading 2', value: 'h2'}] : []),
        {title: 'Heading 3', value: 'h3'},
        {title: 'Heading 4', value: 'h4'},
        {title: 'Heading 5', value: 'h5'},
        {title: 'Heading 6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      marks: {
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              defineField({
                name: 'linkType',
                title: 'Link Type',
                type: 'string',
                initialValue: 'href',
                options: {
                  list: [
                    {title: 'URL', value: 'href'},
                    {title: 'Page', value: 'page'},
                  ],
                  layout: 'radio',
                },
              }),
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                hidden: ({parent}) => parent?.linkType !== 'href' && parent?.linkType != null,
                validation: (Rule) =>
                  // The default accepts only http(s), which rejects mailto: and tel: links. Relative
                  // paths and # (the placeholder convention) are allowed, as on the shared link.
                  Rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}).custom(
                    (value, context) => {
                      const parent = context.parent as Link
                      if (parent?.linkType === 'href' && !value) {
                        return 'URL is required when Link Type is URL'
                      }
                      return true
                    },
                  ),
              }),
              defineField({
                name: 'page',
                title: 'Page',
                type: 'reference',
                to: [{type: 'page'}],
                hidden: ({parent}) => parent?.linkType !== 'page',
                validation: (Rule) =>
                  Rule.custom((value, context) => {
                    const parent = context.parent as Link
                    if (parent?.linkType === 'page' && !value) {
                      return 'Page reference is required when Link Type is Page'
                    }
                    return true
                  }),
              }),
              defineField({
                name: 'openInNewTab',
                title: 'Open in new tab',
                type: 'boolean',
                initialValue: false,
              }),
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [altTextField()],
    }),
    defineArrayMember({type: 'anchorLinks'}),
  ]
}

export const blockContent = defineType({
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: blockContentMembers(),
})
