'use client'

import {useCallback, useEffect, useRef, useState} from 'react'

/**
 * The scrolling row of timeline entries with previous/next buttons. The buttons appear only when
 * the row overflows, and each is disabled at its end, so neither is ever a button that does nothing.
 */
export default function TimelineTrack({children}: {children: React.ReactNode}) {
  const trackRef = useRef<HTMLOListElement>(null)
  const [scroll, setScroll] = useState({overflows: false, canPrev: false, canNext: false})

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setScroll({
      overflows: max > 1,
      canPrev: track.scrollLeft > 1,
      canNext: track.scrollLeft < max - 1,
    })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    measure()
    track.addEventListener('scroll', measure, {passive: true})
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => {
      track.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  const buttonClass =
    'w-14 h-14 rounded-full border border-dusty-heath-600 disabled:opacity-40 disabled:cursor-default'

  return (
    <>
      <ol
        ref={trackRef}
        className="flex gap-16 overflow-x-auto list-none m-0 p-0"
        aria-label="Timeline"
        tabIndex={0}
      >
        {children}
      </ol>
      {scroll.overflows && (
        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!scroll.canPrev}
            className={buttonClass}
            aria-label="Previous"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!scroll.canNext}
            className={buttonClass}
            aria-label="Next"
          >
            &rarr;
          </button>
        </div>
      )}
    </>
  )
}
