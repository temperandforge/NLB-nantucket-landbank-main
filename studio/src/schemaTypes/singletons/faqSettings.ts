import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * FAQ Settings singleton (id `faqSettings`, listed under FAQs). Settings that apply to every FAQ
 * list on the site, as opposed to one FAQ or one block.
 */
export const faqSettings = defineType({
  name: 'faqSettings',
  title: 'FAQ Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'uncategorisedCategory',
      title: 'Category for uncategorised FAQs',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      description:
        'FAQs with no category are shown under this one, e.g. "General FAQs". Leave empty to show them in a separate list above the categories.',
    }),
  ],
  preview: {prepare: () => ({title: 'FAQ Settings'})},
})
