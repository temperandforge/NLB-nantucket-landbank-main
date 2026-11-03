import {ThListIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A data table inside rich text, for schedules, fees and minutes. Every row has the same number of
 * cells; the first row can be the header, which is what lets a screen reader announce a column
 * name with each cell. Plain text only: a cell is a short value, not a paragraph.
 */
export const table = defineType({
  name: 'table',
  title: 'Table',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tableRow',
          fields: [
            defineField({
              name: 'cells',
              title: 'Cells',
              type: 'array',
              of: [defineArrayMember({type: 'string'})],
              validation: (rule) => rule.required().min(1).max(6),
            }),
          ],
          preview: {
            select: {cells: 'cells'},
            prepare: ({cells}) => ({title: (cells ?? []).join('  |  ') || 'Empty row'}),
          },
        }),
      ],
      description: 'Add a row, then add a cell for each column (up to 6). Every row needs the same number of cells.',
      validation: (rule) =>
        rule.required().min(1).custom((rows) => {
          const counts = new Set(
            ((rows ?? []) as {cells?: string[]}[]).map((row) => row.cells?.length ?? 0),
          )
          return counts.size > 1 ? 'Every row needs the same number of cells' : true
        }),
    }),
    defineField({
      name: 'firstRowHeader',
      title: 'First row is a header',
      type: 'boolean',
      initialValue: true,
      description: 'Shows the first row as column headings. Leave on unless the table has none.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional. A short title for the table, shown under it and read out by screen readers.',
    }),
  ],
  preview: {
    select: {rows: 'rows', caption: 'caption'},
    prepare: ({rows, caption}) => ({
      title: caption || 'Table',
      subtitle: `${rows?.length ?? 0} rows × ${rows?.[0]?.cells?.length ?? 0} columns`,
    }),
  },
})
