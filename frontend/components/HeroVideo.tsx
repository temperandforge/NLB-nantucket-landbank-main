'use client'

import {useEffect, useRef, useState} from 'react'

import Image from '@/components/SanityImage'
import {ExtractPageBuilderType} from '@/sanity/lib/types'

type HeroVideoProps = {
  block: ExtractPageBuilderType<'heroVideo'>
  index: number
  pageId: string
  pageType: string
}

/**
 * Full-bleed video at the 1440 x 800 proportions of the Figma hero (Nav_Hero_01).
 *
 * Autoplays muted and looping unless the editor turned autoplay off or the visitor prefers
 * reduced motion. A pause/play button is always present, since moving content that runs for more
 * than a few seconds has to be stoppable.
 */
export default function HeroVideo({block}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wantsAutoplay = block?.autoplay !== false
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!wantsAutoplay || reducedMotion) {
      video.pause()
      return
    }
    // The poster is the LCP element, and the video starts downloading the moment it plays. Wait
    // until the page has loaded (and the browser is idle) so the two don't compete for bandwidth,
    // which matters most on a phone. Browsers may still refuse to play; the poster stays visible
    // and the button starts it.
    const start = () => {
      video.play().catch(() => setPlaying(false))
    }
    let idle: number | undefined
    let timer: number | undefined
    const whenLoaded = () => {
      // Safari has no requestIdleCallback: a short timer is its fallback.
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(start, {timeout: 2000})
      } else {
        timer = window.setTimeout(start, 500)
      }
    }
    if (document.readyState === 'complete') whenLoaded()
    else window.addEventListener('load', whenLoaded, {once: true})
    return () => {
      window.removeEventListener('load', whenLoaded)
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [wantsAutoplay])

  if (!block?.videoUrl) return null
  const poster = block.poster

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  return (
    <section className="relative w-full aspect-[9/5] min-h-72 overflow-hidden bg-black">
      {poster?.asset?._ref && (
        <Image
          id={poster.asset._ref}
          alt=""
          width={1920}
          hotspot={poster.hotspot}
          crop={poster.crop}
          mode="cover"
          sizes="100vw"
          // The poster is the largest paint on the home page: never lazy, fetched first.
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        src={block.videoUrl}
        muted
        loop
        playsInline
        preload="none"
        aria-label={block.alt || undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute bottom-4 right-4 rounded-full bg-black/60 px-4 py-2 text-sm text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
      >
        {playing ? 'Pause video' : 'Play video'}
      </button>
    </section>
  )
}
