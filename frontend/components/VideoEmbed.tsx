'use client'

import {useState} from 'react'

import {PlayIcon} from '@/components/icons'

/**
 * A video that stays a button until pressed. Nothing is requested from the video host before then,
 * so the page's first paint carries no third-party script, cookie or image. `src` is a player
 * address from `videoEmbedSrc`.
 */
export default function VideoEmbed({src, title}: {src: string; title: string}) {
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
        <button type="button" className="video-embed__play" onClick={() => setPlaying(true)}>
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
