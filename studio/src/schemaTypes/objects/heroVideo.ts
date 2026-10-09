import {PlayIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * Full-bleed hero video, edge to edge beneath the site header. Figma: Nav_Hero_01 (1440 x 800).
 * Plays automatically, muted and looping, which is the only way browsers allow autoplay.
 */
export const heroVideo = defineBlock({
  name: 'heroVideo',
  title: 'Hero Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      description:
        'MP4 (H.264), shown full width at roughly 9:5 (1440 x 800 in the design). Keep it short and compressed - it loads on every visit.',
      options: {accept: 'video/mp4,video/webm'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      description:
        'Shown while the video loads, and to visitors whose device or settings prevent autoplay.',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Description',
      type: 'string',
      description: 'Describe what the video shows, for screen readers.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
      initialValue: true,
      description:
        'Start playing when the page loads (muted). Turn off to show the poster until a visitor presses play.',
    }),
  ],
  preview: {
    select: {alt: 'alt', media: 'poster'},
    prepare({alt, media}) {
      return {title: alt || 'Hero Video', subtitle: 'Hero Video', media}
    },
  },
})
