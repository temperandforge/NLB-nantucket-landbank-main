import {DocumentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A public record: one downloadable file under a category. Its row on the site is labelled with
 * the title, else the date, else the file name, so a dated entry (meeting minutes) can leave the
 * title blank and a titled one (a policy) can leave the date blank.
 */
export const record = defineType({
  name: 'record',
  title: 'Record',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional. Shown as the row’s name; when empty the date, then the file name, is used.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'Optional. Used for the year filter and for newest-first ordering.',
      validation: (rule) =>
        rule
          .custom(async (value, context) => {
            if (value) return true
            const categoryId = (context.document as {category?: {_ref?: string}} | undefined)?.category?._ref
            if (!categoryId) return true
            const category = await context
              .getClient({apiVersion: '2025-09-25'})
              .fetch<{sortBy?: string | null; filters?: string[] | null} | null>(
                `*[_id == $id][0]{sortBy, filters}`,
                {id: categoryId},
              )
            const needsDate =
              (category?.sortBy ?? 'dateDesc') === 'dateDesc' || (category?.filters ?? []).includes('year')
            return needsDate
              ? 'This category orders by date or filters by year, so a record with no date is listed last and never matches a year.'
              : true
          })
          .warning(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'recordCategory'}],
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'date', fileName: 'file.asset.originalFilename', category: 'category.title'},
    prepare: ({title, date, fileName, category}) => ({
      title: title || date || fileName || 'Untitled record',
      subtitle: category,
    }),
  },
})
