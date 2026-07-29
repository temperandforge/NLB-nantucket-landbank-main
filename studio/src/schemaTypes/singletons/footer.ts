import {defineField, defineType} from 'sanity'
import {ChevronDownIcon} from '@sanity/icons'

/**
 * Footer schema Singleton - the content of the site-wide footer.
 *
 * Lives under Globals in the Studio structure (see src/structure/index.ts) and is edited as
 * one fixed document with id 'footer'. Separate from Site Settings, which is metadata about
 * the site rather than the content of a specific region.
 *
 * The copyright line is not stored here: the frontend renders
 * "Copyright (c) {current year} {organizationName}" so the year never goes stale.
 */

export const footer = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  icon: ChevronDownIcon,
  fields: [
    defineField({
      name: 'newsletterHeading',
      title: 'Newsletter heading',
      type: 'string',
      description: 'Headline above the email signup form.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'infoColumns',
      title: 'Info columns',
      type: 'array',
      of: [{type: 'infoColumn'}],
      description:
        'The labelled columns in the top band - Contact, Address, Office Hours. Three fit the design; more will wrap.',
    }),
    defineField({
      name: 'footerMenu',
      title: 'Footer menu',
      type: 'reference',
      to: [{type: 'menu'}],
      description: 'The main navigation columns. Top-level submenus become column headings.',
    }),
    defineField({
      name: 'legalMenu',
      title: 'Legal menu',
      type: 'reference',
      to: [{type: 'menu'}],
      description: 'Small links beside the copyright, e.g. Privacy Policy.',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [{type: 'socialLink'}],
    }),
    defineField({
      name: 'organizationName',
      title: 'Organization name',
      type: 'string',
      description: 'Used in the copyright line. The year is added automatically.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Footer',
      }
    },
  },
})
