import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons'

/**
 * A single clickable menu entry - a label plus the shared 'link' object, so menus get
 * URL / page reference / post reference support and 'open in new tab' for free, and link
 * authoring stays consistent with the rest of the Studio.
 *
 * Used as a leaf both at the top level of a menu and inside a menuGroup's submenu. Menu
 * nesting is deliberately capped at two levels (menuGroup -> menuLink); see menuGroup.ts.
 */

export const menuLink = defineType({
  name: 'menuLink',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'The text shown in the menu.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      label: 'label',
      linkType: 'link.linkType',
      href: 'link.href',
      pageSlug: 'link.page->slug.current',
      postSlug: 'link.post->slug.current',
    },
    prepare({label, linkType, href, pageSlug, postSlug}) {
      // Show where the link actually points, so a menu of a dozen items is scannable
      // without opening each one.
      let subtitle: string | undefined
      switch (linkType) {
        case 'href':
          subtitle = href
          break
        case 'page':
          subtitle = pageSlug ? `/${pageSlug}` : 'No page selected'
          break
        case 'post':
          subtitle = postSlug ? `/posts/${postSlug}` : 'No post selected'
          break
        default:
          subtitle = undefined
      }
      return {title: label || 'Untitled link', subtitle}
    },
  },
})
