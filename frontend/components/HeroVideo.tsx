'use client'

import {useEffect, useRef, useState} from 'react'

import {PauseIcon, PlayIcon} from '@/components/icons'
import Image from '@/components/SanityImage'
import {watchOnScreen} from '@/components/watchOnScreen'
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
 * than a few seconds has to be stoppable. It plays only while it is on screen in a foreground tab,
 * and resumes afterwards unless the visitor paused it themselves.
 */
export default function HeroVideo({block}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wantsAutoplay = block?.autoplay !== false
  const [playing, setPlaying] = useState(false)
  // The visitor pressed pause: scrolling back into view must not override that.
  const userPaused = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!wantsAutoplay || reducedMotion) {
      video.pause()
      return
    }
    // Whether the video is on screen in a foreground tab, and whether the load-time start has
    // happened. It plays only when both are true and the visitor hasn't paused it.
    let onScreen = false
    let started = false
    const play = () => {
      if (onScreen && started && !userPaused.current) video.play().catch(() => setPlaying(false))
    }
    const stopWatching = watchOnScreen(video, (active) => {
      onScreen = active
      if (active) play()
      else video.pause()
    })
    // The poster is the LCP element, and the video starts downloading the moment it plays. Wait
    // until the page has loaded (and the browser is idle) so the two don't compete for bandwidth,
    // which matters most on a phone. Browsers may still refuse to play; the poster stays visible
    // and the button starts it.
    const start = () => {
      started = true
      play()
    }
    let idle: number | undefined
    let timer: number | undefined
    const whenSettled = () => {
      // Safari has no requestIdleCallback: a short timer is its fallback.
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(start, {timeout: 2000})
      } else {
        timer = window.setTimeout(start, 500)
      }
    }
    // `load` is not late enough: it can fire well before the first paint, and the video (tens of
    // MB) then competes with the poster for bandwidth. Wait for the first paint as well.
    let loaded = document.readyState === 'complete'
    let painted = false
    let began = false
    const maybeBegin = () => {
      if (began || !loaded || !painted) return
      began = true
      whenSettled()
    }
    const onLoad = () => {
      loaded = true
      maybeBegin()
    }
    if (!loaded) window.addEventListener('load', onLoad, {once: true})
    let paintObserver: PerformanceObserver | undefined
    try {
      paintObserver = new PerformanceObserver((list) => {
        if (list.getEntriesByName('first-contentful-paint').length === 0) return
        painted = true
        paintObserver?.disconnect()
        maybeBegin()
      })
      paintObserver.observe({type: 'paint', buffered: true})
    } catch {
      // No Paint Timing: don't wait on it.
      painted = true
    }
    maybeBegin()
    return () => {
      stopWatching()
      paintObserver?.disconnect()
      window.removeEventListener('load', onLoad)
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [wantsAutoplay])

  if (!block?.videoUrl) return null
  const poster = block.poster

  function toggle() {
    const video = videoRef.current
    if (!video) return
    userPaused.current = !video.paused
    if (video.paused) void video.play()
    else video.pause()
  }

  return (
    // Height is capped to what's left of the first screen once the nav bar (--header-height) and the
    // 34px minimum banner are taken off, so the whole section is above the fold on short or wide
    // viewports. `object-cover` on the poster and video crops the sides to fit; min-h-72 still wins
    // on a phone, where the 9/5 box is already short.
    <section className="relative w-full aspect-[9/5] min-h-72 max-h-[calc(100dvh-var(--header-height)-2.125rem)] overflow-hidden bg-black">
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
        className="group icon-button icon-button-primary absolute right-4 bottom-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {playing ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
        <span className="sr-only">{playing ? 'Pause video' : 'Play video'}</span>
        {/* Visual tooltip only: the sr-only label above is the accessible name. Shown on hover and
            keyboard focus; `pointer-events-none` so it never blocks the video beneath. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-full mb-2 whitespace-nowrap rounded bg-black/85 px-2.5 py-1.5 font-secondary text-body-small text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          {playing ? 'Pause video' : 'Play video'}
        </span>
      </button>
    </section>
  )
}
