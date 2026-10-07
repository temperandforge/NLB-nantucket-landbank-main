import {DownloadIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** A list of downloadable files. */
export const downloadBlock = defineType({
  name: 'downloadBlock',
  title: 'Download Block',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'downloads',
      title: 'Files',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'download',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Defaults to the file’s name when left empty.',
            }),
            defineField({
              name: 'file',
              title: 'File',
              type: 'file',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'file.asset.originalFilename'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {downloads: 'downloads'},
    prepare: ({downloads}) => ({
      title: 'Download Block',
      subtitle: `${downloads?.length ?? 0} files`,
    }),
  },
})
