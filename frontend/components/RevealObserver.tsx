'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

const PART_SELECTOR = 'h1, h2, h3, h4, p, figure, img, video, blockquote, ul, ol, [data-reveal-part]'
const SKIP_SELECTOR = '.splide, .mapboxgl-map, form, [data-reveal-skip]'
const MAX_PARTS = 8

/** Anything whose top edge is above the bottom of the viewport is on screen or already scrolled past. */
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}

/**
 * The elements of a block that arrive one after another: headings, copy, media. Backgrounds and
 * decorative art are not candidates, so they stay still while the content staggers over them.
 * querySelectorAll is in document order (parents before children), so skipping anything an earlier
 * part contains collapses nested matches to the outermost. Capped so a long archive staggers only
 * its first screen.
 */
function pickParts(block: HTMLElement): HTMLElement[] {
  const parts: HTMLElement[] = []
  for (const el of block.querySelectorAll<HTMLElement>(PART_SELECTOR)) {
    if (parts.length >= MAX_PARTS) break
    if (el.closest(SKIP_SELECTOR)) continue
    if (parts.some((part) => part.contains(el))) continue
    parts.push(el)
  }
  return parts
}

/** Tag a block's parts once. A block with no parts keeps the whole-block rise. */
function markParts(block: HTMLElement) {
  if (block.hasAttribute('data-reveal-staggered')) return
  const parts = pickParts(block)
  if (parts.length === 0) return
  parts.forEach((part, index) => {
    part.setAttribute('data-reveal-part', '')
    part.style.setProperty('--reveal-index', String(index))
  })
  block.setAttribute('data-reveal-staggered', '')
}

/**
 * Show an element with no transition or stagger. A block inserted after `js-reveal` is on <html>
 * (client navigation, a live-content refresh) is already styled hidden, so without this it would
 * animate in from hidden even though it is on screen.
 */
function revealInstantly(el: HTMLElement) {
  el.setAttribute('data-reveal-instant', '')
  el.style.transition = 'none'
  el.setAttribute('data-revealed', '')
  void el.offsetHeight // commit the un-transitioned state
  requestAnimationFrame(() => {
    el.style.transition = ''
  })
}

/**
 * Drives the scroll-reveal motion defined in css/ui.css. Renders nothing.
 *
 * Blocks opt in with [data-reveal]. Content already in the viewport is shown immediately (no
 * animation, no hidden frame); everything below the fold is revealed once, as it scrolls into
 * view, with the block's parts staggered. A MutationObserver picks up blocks that appear or
 * change after mount, so nothing is left hidden and unobserved. Pass `disabled` in draft mode so
 * editors always see content.
 */
export default function RevealObserver({disabled = false}: {disabled?: boolean}) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    if (disabled || typeof IntersectionObserver === 'undefined') {
      root.classList.remove('js-reveal')
      return
    }

    // threshold 0: any overlap with the root reveals. A ratio threshold can never be met by a block
    // taller than the root divided by that ratio, which would leave a long archive hidden forever.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      {rootMargin: '0px 0px -15% 0px', threshold: 0},
    )

    const watching = new WeakSet<Element>()
    const process = () => {
      const pending = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
      for (const el of pending) {
        if (watching.has(el)) continue
        markParts(el) // before js-reveal is added, so a part is never hidden before its block is ready
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

    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [pathname, disabled])

  return null
}
