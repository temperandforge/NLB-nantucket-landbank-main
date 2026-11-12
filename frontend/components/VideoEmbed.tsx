'use client'

import {useState} from 'react'

import {PlayIcon} from '@/components/icons'
import Image from '@/components/SanityImage'

/**
 * A video that stays a button until pressed. Nothing is requested from the video host before then,
 * so the page's first paint carries no third-party script, cookie or image. `src` is a player
 * address from `videoEmbedSrc`.
 */
export default function VideoEmbed({
  src,
  title,
  poster,
}: {
  src: string
  title: string
  /** An optional picture behind the play button, from the site's own image CDN. */
  poster?: {id: string; crop?: React.ComponentProps<typeof Image>['crop']; hotspot?: React.ComponentProps<typeof Image>['hotspot']}
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="video-embed">
      {playing ? (
        <iframe
          src={`${src}${src.includes('?') ? '&' : '?'}autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="video-embed__frame"
        />
      ) : (
        <button
          type="button"
          className={`video-embed__play${poster ? ' video-embed__play--poster' : ''}`}
          onClick={() => setPlaying(true)}
        >
          {poster && (
            <Image
              id={poster.id}
              alt=""
              width={1280}
              mode="cover"
              crop={poster.crop}
              hotspot={poster.hotspot}
              sizes="(min-width: 820px) 820px, 100vw"
              className="video-embed__poster"
            />
          )}
          <PlayIcon className="video-embed__icon" />
          <span className="video-embed__title">
            <span className="sr-only">Play video: </span>
            {title}
          </span>
        </button>
      )}
    </div>
  )
}
