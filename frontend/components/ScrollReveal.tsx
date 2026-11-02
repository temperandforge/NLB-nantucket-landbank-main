'use client'

import {useEffect} from 'react'

import {PART_SELECTOR} from '@/sanity/lib/enter'

/** Parts that come into view in the same frame are offset by this much, so a row staggers. */
const STEP_MS = 70
const MAX_STEPS = 4

/**
 * Plays each part of a page block once, the first time it scrolls into view. Renders nothing.
 *
 * motion.css fades the first screen in on a timer. Anything below it used to scrub with scroll
 * position, which reverses and drifts as you scroll. Here, after hydration, every part that starts
 * below the screen is held back (data-reveal="hidden") and then plays one fade on its own clock
 * (data-reveal="shown") the first time it enters view. It never reverses.
 *
 * The server HTML carries no data-reveal, so without JavaScript everything is visible. Parts already
 * on screen are left alone, and reduced motion and Studio Presentation are skipped. Parts added later
 * (a filter remounting a grid, a route change, a Suspense swap) are picked up by a MutationObserver.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (document.documentElement.hasAttribute('data-draft')) return

    const selector = `[data-enter] ${PART_SELECTOR}`
    const seen = new WeakSet<Element>()
    const pending = new Set<HTMLElement>()

    const observer = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left,
          )
        arriving.forEach((entry, index) => {
          const el = entry.target as HTMLElement
          el.style.setProperty('--reveal-delay', `${Math.min(index, MAX_STEPS) * STEP_MS}ms`)
          el.dataset.reveal = 'shown'
          pending.delete(el)
          observer.unobserve(el)
        })
      },
      {rootMargin: '0px 0px -10% 0px'},
    )

    function consider(el: Element) {
      if (seen.has(el)) return
      seen.add(el)
      // Read every position before writing any attribute, so a long page is one layout, not many.
      if (el.getBoundingClientRect().top < window.innerHeight) return
      ;(el as HTMLElement).dataset.reveal = 'hidden'
      pending.add(el as HTMLElement)
      observer.observe(el)
    }

    // The observer waits for a part to clear the bottom 10% of the screen, which a part in the last
    // stretch of a page never can. Once scrolling stops, anything still held back that is on screen
    // at all is shown.
    let idle = 0
    function flushVisible() {
      const entering = [...pending].filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
      })
      entering.forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${Math.min(index, MAX_STEPS) * STEP_MS}ms`)
        el.dataset.reveal = 'shown'
        pending.delete(el)
        observer.unobserve(el)
      })
    }
    function onScroll() {
      window.clearTimeout(idle)
      idle = window.setTimeout(flushVisible, 200)
    }
    window.addEventListener('scroll', onScroll, {passive: true})

    function scan(root: Element) {
      const found = new Set<Element>(root.querySelectorAll(selector))
      if (root.matches(selector)) found.add(root)
      found.forEach(consider)
    }

    scan(document.body)

    let queued: Element[] = []
    let frame = 0
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) queued.push(node)
        })
      }
      if (queued.length === 0 || frame) return
      frame = requestAnimationFrame(() => {
        const batch = queued
        queued = []
        frame = 0
        batch.forEach((node) => node.isConnected && scan(node))
      })
    })
    mutations.observe(document.body, {childList: true, subtree: true})

    return () => {
      window.clearTimeout(idle)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      mutations.disconnect()
      observer.disconnect()
    }
  }, [])

  return null
}
