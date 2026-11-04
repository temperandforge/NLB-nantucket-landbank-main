'use client'

import {
  Children,
  Fragment,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import {watchOnScreen} from '@/components/watchOnScreen'

// How long the current slide stays, and how long a step takes.
const INTERVAL_MS = 4000
const SPEED_MS = 600
// The space between two cards, whatever their sizes.
const GAP = 24
// Sizes from the Figma carousel: a resting card and how much wider the current one is (matching the
// classes in ImageCarouselSlide).
const DESKTOP = {base: 368, grow: 48}
const MOBILE = {base: 260, grow: 32}
// Pointer travel before a press becomes a drag, and how far ahead (ms of release velocity) a flick
// looks when choosing where to settle.
const DRAG_START_PX = 6
const FLICK_MS = 180
// Cards kept beyond the ones that fit, so a slide is in place before it scrolls into view, and the
// fewest cards ever rendered: enough to fill about 2,300px, so a measurement that comes up short
// (a track that is not laid out yet, a window that is resized later) still leaves no empty side.
const SPARE = 6
const MIN_CARDS = 8

const mod = (value: number, size: number) => ((value % size) + size) % size
const ease = (t: number) => 1 - Math.pow(1 - t, 4)

// An endless carousel with one current slide, always centred. Everything is driven from one number,
// `pos`: the (fractional) index of the slide at the centre. A slide's weight is how close it is to
// that point (1 on it, 0 a whole step away) and sets its width between a resting card and the
// current one; cards are laid out outward from the centre by their real widths plus a fixed gap, so
// the gap is the same on every frame of a step and the centre never drifts. Cards are drawn with a
// transform (move and scale about the centre, which keeps the 4:5 ratio), so nothing re-lays out.
//
// The slides are rendered in as many copies as fill the track, and each copy sits at whichever
// logical index is nearest the centre, so `pos` just keeps counting and the loop has no seam.
// Steps run on a timer, only while the carousel is on screen in a foreground tab and the pointer or
// focus is not inside it, and not for reduced-motion visitors. Dragging, flicking, the arrow keys
// and a click on a side slide move it by hand; a slide's link works only once it is the current one.
// While it is still, nothing runs.
export default function ImageCarouselTrack({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const slides = Children.toArray(children)
  const count = slides.length
  const root = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)
  // Where the track is and where it is headed; survives the engine restarting when copies change.
  const motion = useRef({pos: 0, target: 0})

  // Copies enough of the slides to fill the track and a few more.
  useEffect(() => {
    const el = root.current
    if (!el || count < 2) return
    const measure = () => {
      const {base} = window.matchMedia('(min-width: 768px)').matches ? DESKTOP : MOBILE
      // The window is the ceiling for a track that is as wide as its section.
      const width = Math.max(el.clientWidth, window.innerWidth)
      const needed = Math.max(MIN_CARDS, Math.ceil(width / (base + GAP)) + SPARE)
      setCopies(Math.max(1, Math.ceil(needed / count)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [count])

  useLayoutEffect(() => {
    const el = root.current
    const track = list.current
    if (!el || !track) return
    const items = Array.from(track.children) as HTMLElement[]
    const n = items.length
    if (n === 0) return

    const looped = count >= 2
    const wide = window.matchMedia('(min-width: 768px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const state = motion.current
    let {base, grow} = wide.matches ? DESKTOP : MOBILE
    // Pointer travel per step when dragging: one step is about this far between card centres.
    const stride = () => base + grow / 2 + GAP

    const weight = (index: number) => Math.max(0, 1 - Math.abs(index - state.pos))
    const widthOf = (index: number) => base + grow * weight(index)

    const render = () => {
      if (!looped) {
        items[0].style.transform = `scale(${(base + grow) / base})`
        items[0].style.setProperty('--w', '1')
        return
      }
      const lower = Math.floor(state.pos)
      const fraction = state.pos - lower
      // A window of n consecutive logical indices around the centre: one per card.
      const first = lower - Math.floor((n - 1) / 2)
      const last = first + n - 1
      const x = new Array<number>(n)
      // The two cards around the centre are always `stride` apart, so the centre sits `fraction`
      // of the way between them wherever it is.
      x[lower - first] = -fraction * stride()
      for (let index = lower + 1; index <= last; index++) {
        x[index - first] = x[index - 1 - first] + (widthOf(index - 1) + widthOf(index)) / 2 + GAP
      }
      for (let index = lower - 1; index >= first; index--) {
        x[index - first] = x[index + 1 - first] - (widthOf(index) + widthOf(index + 1)) / 2 - GAP
      }
      for (let index = first; index <= last; index++) {
        const item = items[mod(index, n)]
        const w = weight(index)
        item.style.transform = `translate3d(${x[index - first].toFixed(2)}px,0,0) scale(${(widthOf(index) / base).toFixed(4)})`
        item.style.setProperty('--w', w.toFixed(3))
        item.style.zIndex = w > 0.5 ? '2' : '1'
      }
    }

    // Only the slide at the centre can be reached by keyboard or read out; the rest, and every
    // copy, are decoration.
    const markCurrent = () => {
      const current = looped ? mod(state.target, n) : 0
      items.forEach((item, i) => {
        item.tabIndex = i === current ? 0 : -1
        if (i === current) item.removeAttribute('aria-hidden')
        else item.setAttribute('aria-hidden', 'true')
      })
    }

    const layout = () => {
      ;({base, grow} = wide.matches ? DESKTOP : MOBILE)
      render()
    }

    track.dataset.ready = ''
    layout()
    markCurrent()
    wide.addEventListener('change', layout)

    // Moving: one animation at a time, from wherever the track is now.
    let frame = 0
    let timer = 0
    let deadline = 0
    let remaining = INTERVAL_MS
    let visible = false
    let hovered = false
    let focused = false
    let dragging = false
    let dragged = false

    // Keeps the position (and the target) small without changing what is drawn.
    const settle = () => {
      const shift = n * Math.floor(state.pos / n)
      state.pos -= shift
      state.target -= shift
      render()
    }

    // The timer runs only while nothing else is going on; pausing keeps how long was left, and
    // resuming carries on from there.
    const sync = () => {
      const run =
        looped && visible && !hovered && !focused && !dragging && frame === 0 && !reduced.matches
      if (run && !timer) {
        deadline = performance.now() + remaining
        timer = window.setTimeout(() => {
          timer = 0
          goTo(state.target + 1)
        }, remaining)
      } else if (!run && timer) {
        window.clearTimeout(timer)
        timer = 0
        remaining = Math.max(0, deadline - performance.now())
      }
    }

    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    function goTo(target: number) {
      stop()
      window.clearTimeout(timer)
      timer = 0
      remaining = INTERVAL_MS
      state.target = target
      markCurrent()
      const from = state.pos
      const distance = Math.abs(target - from)
      if (reduced.matches || distance < 0.001) {
        state.pos = target
        settle()
        sync()
        return
      }
      const duration = Math.min(1200, SPEED_MS * (1 + 0.3 * Math.max(0, distance - 1)))
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        state.pos = from + (target - from) * ease(t)
        render()
        if (t < 1) {
          frame = requestAnimationFrame(step)
        } else {
          frame = 0
          settle()
          sync()
        }
      }
      frame = requestAnimationFrame(step)
      sync()
    }

    // By hand: drag or swipe moves the track with the pointer and a release settles on the nearest
    // slide, leaning the way it was flung.
    let pointerId = -1
    let startX = 0
    let startPos = 0
    let samples: {x: number; t: number}[] = []
    const onPointerDown = (event: PointerEvent) => {
      if (!looped || event.button !== 0 || pointerId !== -1) return
      pointerId = event.pointerId
      startX = event.clientX
      startPos = state.pos
      samples = [{x: event.clientX, t: event.timeStamp}]
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (!dragging) {
        if (Math.abs(event.clientX - startX) < DRAG_START_PX) return
        dragging = true
        dragged = true
        // Take hold from wherever a step in progress has got to.
        stop()
        startX = event.clientX
        startPos = state.pos
        el.setPointerCapture(event.pointerId)
        sync()
      }
      state.pos = startPos - (event.clientX - startX) / stride()
      samples.push({x: event.clientX, t: event.timeStamp})
      while (samples.length > 2 && event.timeStamp - samples[0].t > 100) samples.shift()
      render()
    }
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = -1
      if (!dragging) return
      dragging = false
      const first = samples[0]
      const last = samples[samples.length - 1]
      const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
      goTo(Math.round(state.pos - (velocity / stride()) * FLICK_MS))
      // The click that follows a drag is not a click.
      window.setTimeout(() => (dragged = false), 0)
    }

    // A click on a side slide centres it instead of following its link.
    const onClick = (event: MouseEvent) => {
      if (dragged) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const slide =
        event.target instanceof Element ? event.target.closest('[data-ready] > *') : null
      const i = slide ? items.indexOf(slide as HTMLElement) : -1
      if (i === -1 || i === mod(state.target, n)) return
      // Not the slide's own click (a link, or a button that opens a lightbox): centre it instead.
      event.preventDefault()
      event.stopPropagation()
      goTo(i + n * Math.round((state.target - i) / n))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!looped || event.target !== el) return
      if (event.key === 'ArrowRight') goTo(state.target + 1)
      else if (event.key === 'ArrowLeft') goTo(state.target - 1)
      else return
      event.preventDefault()
    }

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      hovered = true
      sync()
    }
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      hovered = false
      sync()
    }
    // Keyboard focus pauses it; focus a click leaves behind does not.
    const onFocusIn = (event: FocusEvent) => {
      focused = event.target instanceof Element && event.target.matches(':focus-visible')
      sync()
    }
    const onFocusOut = (event: FocusEvent) => {
      focused =
        event.relatedTarget instanceof Element &&
        el.contains(event.relatedTarget) &&
        event.relatedTarget.matches(':focus-visible')
      sync()
    }
    const onDragStart = (event: Event) => event.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerEnd)
    el.addEventListener('pointercancel', onPointerEnd)
    el.addEventListener('click', onClick, true)
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    el.addEventListener('dragstart', onDragStart)
    reduced.addEventListener('change', sync)
    const stopWatching = watchOnScreen(el, (on) => {
      visible = on
      sync()
    })

    return () => {
      stopWatching()
      stop()
      window.clearTimeout(timer)
      wide.removeEventListener('change', layout)
      reduced.removeEventListener('change', sync)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerEnd)
      el.removeEventListener('pointercancel', onPointerEnd)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
      el.removeEventListener('dragstart', onDragStart)
    }
  }, [copies, count])

  // As wide as its section, edge to edge: the slides beside the current one run to the edges of the
  // viewport and are cut off there, with no fade. The sections that hold it clip sideways overflow.
  // Without JavaScript the row keeps the page's side margins.
  return (
    <section
      ref={root}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      className="w-full touch-pan-y select-none"
    >
      <div
        ref={list}
        className="flex items-center gap-6 overflow-x-auto px-(--tf-x) [scrollbar-width:none] data-[ready]:relative data-[ready]:block data-[ready]:h-[364px] data-[ready]:overflow-hidden data-[ready]:px-0 md:data-[ready]:h-[520px] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({length: copies}, (_, copy) => (
          <Fragment key={copy}>{slides}</Fragment>
        ))}
      </div>
    </section>
  )
}
