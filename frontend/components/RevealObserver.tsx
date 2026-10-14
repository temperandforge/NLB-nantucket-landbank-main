'use client'

import {usePathname} from 'next/navigation'
import {useLayoutEffect} from 'react'

/** Anything whose top edge is above the bottom of the viewport is on screen or already scrolled past. */
function shouldShowNow(el: Element) {
  return el.getBoundingClientRect().top < window.innerHeight
}

/** Show an element with no transition, for content already on screen. */
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
 * view. Pass `disabled` in draft mode so editors always see content.
 */
export default function RevealObserver({disabled = false}: {disabled?: boolean}) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (disabled || typeof IntersectionObserver === 'undefined') return

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'),
    )

    // Runs before first paint, so only scroll-triggered blocks ever animate.
    const belowFold: HTMLElement[] = []
    for (const el of targets) {
      if (shouldShowNow(el)) revealInstantly(el)
      else belowFold.push(el)
    }
    document.documentElement.classList.add('js-reveal')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      {rootMargin: '0px 0px -8% 0px', threshold: 0.1},
    )
    belowFold.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [pathname, disabled])

  return null
}
