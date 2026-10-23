'use client'

import {type ReactNode, type SyntheticEvent, useEffect, useRef, useState} from 'react'

const SPEED_PX_PER_SECOND = 40
const GAP = 24
// Room for a slide to widen on hover without the loop running short.
const SLACK = 400

// Auto-scrolls its slides left in a loop. The slides are repeated until they overflow the track,
// then once more as an inert clone so the wrap-around is seamless. While it runs, the slide nearest
// the centre is the active one: every copy of it gets `data-active` (widened, so all copies keep
// equal widths and the loop period stays exact), but only the copy nearest the centre gets
// `data-current` (the tall card with the label, so one slide reads as active). Pauses while the
// pointer or focus is inside or the user scrolls by hand, and doesn't run for reduced-motion
// users. While paused the active slide is kept, unless the pointer or focus is on a slide, which
// then takes over through hover and focus.
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
  // Whether the pointer, a touch or focus is on a slide, so hover/focus styling already marks one.
  const onSlide = useRef(false)
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
    const all = [...slidesOf(first.current), ...slidesOf(clone.current)]
    // The clone repeats the first group, so a slide's position within a set is its index modulo this.
    const perSet = all.length / 2 / repeats
    let current = -1
    const setActive = (index: number) => {
      if (index === current) return
      current = index
      const logical = index >= 0 ? index % perSet : -1
      all.forEach((slide, i) => {
        slide.toggleAttribute('data-active', logical >= 0 && i % perSet === logical)
        slide.toggleAttribute('data-current', i === index)
      })
    }
    // The slide (of any copy) nearest the centre (offsetLeft is track-relative: the track is
    // `relative`), with hysteresis so widening one slide doesn't flip it straight back.
    const nearest = () => {
      const center = el.scrollLeft + el.clientWidth / 2
      const distance = (slide: HTMLElement) =>
        Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center)
      let best = 0
      all.forEach((slide, i) => {
        if (distance(slide) < distance(all[best])) best = i
      })
      if (current >= 0 && best !== current && distance(all[current]) - distance(all[best]) < 48) {
        return current
      }
      return best
    }

    let frame = 0
    let last = performance.now()
    let position = el.scrollLeft
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (paused.current) {
        // Off the slides (in a gap, say), fall back to the centre slide so one is always active.
        setActive(onSlide.current ? -1 : current >= 0 ? current : nearest())
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

  useEffect(() => {
    track.current
      ?.querySelectorAll<HTMLElement>('[data-copy] a, [data-copy] [tabindex]')
      .forEach((el) => el.setAttribute('tabindex', '-1'))
  }, [looping, repeats])

  const pause = (event: SyntheticEvent) => {
    paused.current = true
    onSlide.current = event.target instanceof Element && event.target.closest('[data-slide]') !== null
  }
  const resume = () => {
    paused.current = false
    onSlide.current = false
  }
  // The pointer moving between a slide and the gaps around it.
  const trackPointer = (event: SyntheticEvent) => {
    if (paused.current) pause(event)
  }

  // Every set after the first, and the whole clone, is presentational: hidden from assistive tech
  // and out of the tab order. Not `inert`, which would also stop hover and clicks, and on a wide
  // screen most of the visible slides are copies.
  const copy = (key: number) => (
    <div key={key} className="contents" aria-hidden="true" data-copy="">
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
      onMouseMove={trackPointer}
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
