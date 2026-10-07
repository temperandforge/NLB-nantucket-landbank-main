'use client'

import {useRef} from 'react'

/** The scrolling row of timeline entries with working previous/next buttons. */
export default function TimelineTrack({children}: {children: React.ReactNode}) {
  const trackRef = useRef<HTMLOListElement>(null)

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

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
      <div className="flex gap-3 mt-6 justify-end">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="w-14 h-14 rounded-full border border-dusty-heath-600"
          aria-label="Previous"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="w-14 h-14 rounded-full border border-dusty-heath-600"
          aria-label="Next"
        >
          &rarr;
        </button>
      </div>
    </>
  )
}
