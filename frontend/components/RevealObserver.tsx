'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

const PART_SELECTOR = 'h1, h2, h3, h4, p, figure, img, video, blockquote, ul, ol'
const SKIP_SELECTOR = '.splide, .mapboxgl-map, form, [data-reveal-skip]'

// A block's parts are the ones within this many viewport heights of its top: everything a visitor
// sees when the block arrives. The stagger delay stops growing after MAX_STAGGER_STEPS parts, so a
// long run of cards lands together instead of dragging on.
const PART_REACH = 1.5
const MAX_PARTS = 24
const MAX_STAGGER_STEPS = 7
const PART_DISTANCE = 32 // px
const PART_DURATION = 700 // ms
const PART_STAGGER = 90 // ms
const PART_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)' // --motion-ease-out in css/ui.css

/** Anything whose top edge is above the bottom of the viewport is on screen or already scrolled past. */
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}

/**
 * An element that is out of flow or already moved by its own translate/transform (a centred pin, a
 * floating image) is decoration, not content. Animating `translate` on it would override its own
 * offset for the length of the animation.
 */
function isPositionedDecoration(el: HTMLElement) {
  const style = getComputedStyle(el)
  return (
    style.position === 'absolute' ||
    style.position === 'fixed' ||
    style.translate !== 'none' ||
    style.transform !== 'none'
  )
}

/**
 * The elements of a block that arrive one after another: headings, copy, media. Backgrounds and
 * decorative art are not candidates, so they stay still while the content staggers over them.
 * querySelectorAll is in document order (parents before children), so skipping anything an earlier
 * part contains collapses nested matches to the outermost.
 */
function pickParts(block: HTMLElement): HTMLElement[] {
  const limit = block.getBoundingClientRect().top + window.innerHeight * PART_REACH
  const parts: HTMLElement[] = []
  for (const el of block.querySelectorAll<HTMLElement>(PART_SELECTOR)) {
    if (parts.length >= MAX_PARTS) break
    if (el.getBoundingClientRect().top > limit) continue
    if (el.closest(SKIP_SELECTOR)) continue
    if (parts.some((part) => part.contains(el))) continue
    if (isPositionedDecoration(el)) continue
    parts.push(el)
  }
  return parts
}

/**
 * Drives the scroll-reveal motion defined in css/ui.css. Renders nothing.
 *
 * Blocks opt in with [data-reveal]. Content already in the viewport is shown immediately (no
 * animation, no hidden frame); everything below the fold is revealed once, as it scrolls into
 * view, with the block's parts staggered.
 *
 * Parts are animated with the Web Animations API rather than tagged with attributes or classes:
 * the page's server HTML is hydrated lazily (archives sit behind Suspense), and any attribute added
 * to an element React has not hydrated yet is reported as a hydration mismatch. Each part gets a
 * paused animation that holds its first keyframe (hidden, offset) until the block reveals, then
 * plays. The keyframe has no end frame, so the animation finishes at the element's own opacity and
 * translate, whatever those are.
 *
 * A MutationObserver picks up blocks that appear or change after mount (and parts that Suspense
 * swaps out), so nothing is left hidden and unobserved. Pass `disabled` in draft mode so editors
 * always see content.
 */
export default function RevealObserver({disabled = false}: {disabled?: boolean}) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    if (disabled || typeof IntersectionObserver === 'undefined') {
      root.classList.remove('js-reveal')
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const staged = new Map<HTMLElement, Animation[]>()

    const cancelStage = (block: HTMLElement) => {
      staged.get(block)?.forEach((animation) => animation.cancel())
      staged.delete(block)
      block.removeAttribute('data-reveal-staggered')
    }

    /** Give a block's parts their paused, hidden-until-played animations. Re-stages if parts were swapped out. */
    const stage = (block: HTMLElement) => {
      if (reduceMotion) return
      const existing = staged.get(block)
      if (existing?.every((animation) => (animation.effect as KeyframeEffect).target?.isConnected)) return
      if (existing) cancelStage(block)

      const animations = pickParts(block).map((part, index) => {
        const animation = part.animate([{opacity: 0, translate: `0 ${PART_DISTANCE}px`}], {
          duration: PART_DURATION,
          delay: Math.min(index, MAX_STAGGER_STEPS) * PART_STAGGER,
          easing: PART_EASE,
          fill: 'backwards',
        })
        animation.pause()
        return animation
      })
      if (animations.length === 0) return
      staged.set(block, animations)
      // The wrapper stays put; its parts move instead (see css/ui.css).
      block.setAttribute('data-reveal-staggered', '')
    }

    /** Show an element with no transition or stagger. */
    const revealInstantly = (el: HTMLElement) => {
      // A block inserted after `js-reveal` is on <html> (client navigation, a live-content refresh)
      // is already styled hidden, so without this it would animate in even though it is on screen.
      cancelStage(el)
      el.style.transition = 'none'
      el.setAttribute('data-revealed', '')
      void el.offsetHeight // commit the un-transitioned state
      requestAnimationFrame(() => {
        el.style.transition = ''
      })
    }

    const reveal = (block: HTMLElement) => {
      block.setAttribute('data-revealed', '')
      staged.get(block)?.forEach((animation) => animation.play())
    }

    // threshold 0: any overlap with the root reveals. A ratio threshold can never be met by a block
    // taller than the root divided by that ratio, which would leave a long archive hidden forever.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          reveal(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      {rootMargin: '0px 0px -15% 0px', threshold: 0},
    )

    const watching = new WeakSet<Element>()
    const process = () => {
      const pending = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
      for (const el of pending) {
        stage(el) // before js-reveal is added, so a part is never visible and then hidden
        if (watching.has(el)) continue
        if (shouldShowNow(el)) {
          revealInstantly(el)
        } else {
          watching.add(el)
          observer.observe(el)
        }
      }
      root.classList.add('js-reveal')
    }

    // Runs before first paint, so only scroll-triggered blocks ever animate.
    process()

    const mutations = new MutationObserver(process)
    mutations.observe(document.getElementById('pageMain') ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-reveal'],
    })

    // Print never scrolls, so a paused animation would leave unseen parts blank.
    const showAll = () => [...staged.keys()].forEach(cancelStage)
    window.addEventListener('beforeprint', showAll)

    return () => {
      window.removeEventListener('beforeprint', showAll)
      observer.disconnect()
      mutations.disconnect()
      showAll()
    }
  }, [pathname, disabled])

  return null
}
