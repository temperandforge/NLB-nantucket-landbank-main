'use client'

import {useEffect, useRef, type ReactNode} from 'react'

/** Cards that enter together (one row) are offset by this much, like the load layer's stagger. */
const STEP_MS = 70
const MAX_STEPS = 4

// A card that comes into view in the same frame as others gets the next slot, so a row staggers.
// The count resets on the next frame.
let batch = 0
let resetFrame = 0
function nextDelay() {
  const delay = Math.min(batch, MAX_STEPS) * STEP_MS
  batch += 1
  if (!resetFrame) {
    resetFrame = requestAnimationFrame(() => {
      batch = 0
      resetFrame = 0
    })
  }
  return delay
}

/**
 * A list item for a card grid whose block sits in the load layer (data-enter="load"). motion.css
 * fades every part of that layer in on a timer at page load, which is right for the cards on the
 * first screen but finishes long before a card far down the page is scrolled to. After hydration
 * this holds back only the cards that start below the screen (data-reveal="hidden") and plays the
 * same fade once, on its own clock, when each enters view (data-reveal="shown"). It is not tied to
 * scroll position and never reverses.
 *
 * The server HTML is plain and visible. Cards already on screen, reduced motion, Studio
 * Presentation and a block outside the load layer are left to motion.css, so nothing is ever hidden
 * that the visitor cannot reveal.
 */
export default function RevealItem({className, children}: {className?: string; children: ReactNode}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !el.closest('[data-enter="load"]')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (document.documentElement.hasAttribute('data-draft')) return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    el.dataset.reveal = 'hidden'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        el.style.animationDelay = `${nextDelay()}ms`
        el.dataset.reveal = 'shown'
        observer.disconnect()
      },
      {rootMargin: '0px 0px -10% 0px'},
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      // Never leave a card hidden if it unmounts mid-way (a filter change reuses mounted cards).
      delete el.dataset.reveal
    }
  }, [])

  return (
    <li ref={ref} className={className}>
      {children}
    </li>
  )
}
