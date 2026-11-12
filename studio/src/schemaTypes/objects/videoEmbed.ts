import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A YouTube or Vimeo video inside rich text. Only those two hosts are accepted; the frontend's
 * `videoEmbedSrc` (frontend/sanity/lib/video.ts) does the same check and cannot share code with
 * this file, so change both together. The video loads only when a visitor presses play.
 */
const HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com']

export const videoEmbed = defineType({
  name: 'videoEmbed',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Video address',
      type: 'url',
      description: 'The page address of a YouTube or Vimeo video, as copied from the browser.',
      validation: (rule) =>
        rule
          .required()
          .uri({scheme: ['https']})
          .custom((value) => {
            if (!value) return true
            try {
              return HOSTS.includes(new URL(value).hostname) ? true : 'Use a YouTube or Vimeo address'
            } catch {
              return true
            }
          }),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'What the video is. Shown on the play button and read out by screen readers.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      options: {hotspot: true},
      description:
        'Optional. Shown behind the play button until the video is played. Served from this site, so nothing is requested from YouTube or Vimeo until a visitor presses play. Without one the button sits on a plain background.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional. Shown under the video.',
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'url', media: 'poster'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Video', subtitle, media}),
  },
})
