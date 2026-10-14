'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

/** Anything whose top edge is above the bottom of the viewport is on screen or already scrolled past. */
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}

/**
 * Show an element with no transition. A block inserted after `js-reveal` is on <html> (client
 * navigation, a live-content refresh) is already styled hidden, so without this it would fade in
 * from hidden even though it is on screen.
 */
function revealInstantly(el: HTMLElement) {
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
 * view. A MutationObserver picks up blocks that appear or change after mount, so nothing is left
 * hidden and unobserved. Pass `disabled` in draft mode so editors always see content.
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
