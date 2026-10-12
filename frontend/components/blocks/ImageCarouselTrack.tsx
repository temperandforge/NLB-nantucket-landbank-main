'use client'

import {type ReactNode, useEffect, useRef, useState} from 'react'

const SPEED_PX_PER_SECOND = 40
const GAP = 24
// Room for a slide to widen on hover without the loop running short.
const SLACK = 400

// Auto-scrolls its slides left in a loop. The slides are repeated until they overflow the track,
// then once more as an inert clone so the wrap-around is seamless. While it runs, the slide nearest
// the centre gets `data-active` (the expanded state hover also gives), on every repeat of that
// slide so all copies keep equal widths and the loop period stays exact. Pauses while the pointer
// or focus is inside or the user scrolls by hand, and doesn't run for reduced-motion users.
export default function ImageCarouselTrack({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLDivElement>(null)
  const clone = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const [looping, setLooping] = useState(false)
  const [repeats, setRepeats] = useState(1)

  useEffect(() => {
    const el = track.current
    const slides = first.current
    if (!el || !slides) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const measure = () => {
      setLooping(!motion.matches)
      // The first group is `repeats` sets plus a trailing gap each; recover one set's width.
      const set = (slides.offsetWidth + GAP) / repeats
      if (set > 0) setRepeats(Math.max(1, Math.ceil((el.clientWidth + SLACK + GAP) / set)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    motion.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', measure)
    }
  }, [repeats])

  useEffect(() => {
    const el = track.current
    if (!el || !looping) return

    const slidesOf = (group: HTMLElement | null) =>
      Array.from(group?.querySelectorAll<HTMLElement>('[data-slide]') ?? [])
    const originals = slidesOf(first.current)
    const clones = slidesOf(clone.current)
    const perSet = originals.length / repeats
    let active = -1
    const setActive = (index: number) => {
      if (index === active) return
      active = index
      const mark = (slide: HTMLElement, i: number) =>
        slide.toggleAttribute('data-active', index >= 0 && i % perSet === index)
      originals.forEach(mark)
      clones.forEach(mark)
    }
    // Index within a set of the slide nearest the centre (offsetLeft is track-relative: the track is `relative`), with hysteresis so widening one slide
    // doesn't flip it straight back.
    const nearest = () => {
      const center = el.scrollLeft + el.clientWidth / 2
      const distance = (slide: HTMLElement) =>
        Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center)
      let best = 0
      originals.forEach((slide, i) => {
        if (distance(slide) < distance(originals[best])) best = i
      })
      const current = originals.find((_, i) => i % perSet === active)
      if (
        current &&
        best % perSet !== active &&
        distance(current) - distance(originals[best]) < 48
      ) {
        return active
      }
      return best % perSet
    }

    let frame = 0
    let last = performance.now()
    let position = el.scrollLeft
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (paused.current) {
        setActive(-1)
      } else {
        // Hand-scrolling moves scrollLeft under us; resync rather than fight it.
        if (Math.abs(el.scrollLeft - position) > 2) position = el.scrollLeft
        position += (SPEED_PX_PER_SECOND * dt) / 1000
        const period = (clone.current?.offsetLeft ?? 0) - (first.current?.offsetLeft ?? 0)
        if (period > 0 && position >= period) position -= period
        // Keep the fractional position: scrollLeft may round, and reading it back would stall
        // sub-pixel steps at this speed.
        el.scrollLeft = position
        setActive(nearest())
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setActive(-1)
    }
  }, [looping, repeats])

  const pause = () => {
    paused.current = true
  }
  const resume = () => {
    paused.current = false
  }

  // Every set after the first, and the whole clone, is presentational: hidden from assistive tech
  // and unfocusable.
  const copy = (key: number) => (
    <div key={key} className="contents" aria-hidden="true" {...{inert: true}}>
      {children}
    </div>
  )
  const extraSets = looping ? Array.from({length: repeats - 1}, (_, i) => copy(i)) : null

  return (
    <div
      ref={track}
      className="tf-max-w relative flex items-center overflow-x-auto px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_3rem,black_calc(100%-3rem),transparent)]"
      role="region"
      aria-label={label}
      tabIndex={0}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      <div ref={first} className="flex flex-none items-center gap-6">
        {children}
        {extraSets}
      </div>
      {looping && (
        <div ref={clone} className="ml-6 flex flex-none items-center gap-6">
          {copy(-1)}
          {extraSets}
        </div>
      )}
    </div>
  )
}
