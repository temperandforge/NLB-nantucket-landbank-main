'use client'

import {useEffect, useRef, useState} from 'react'

import {nextHeaderScroll, type HeaderScrollState} from './headerScroll'

/**
 * Sticky wrapper that hides on scroll down and reveals on scroll up (rule in headerScroll.ts).
 *
 * "Locked" means a dropdown or the mobile panel is open (a descendant carries data-header-lock)
 * or keyboard focus is inside the header - in both cases the header must stay put. Anchor jumps
 * reveal it so focus is never left on a hidden element. One passive scroll listener, throttled
 * with requestAnimationFrame. The slide is removed under prefers-reduced-motion.
 */
export default function HeaderShell({children}: {children: React.ReactNode}) {
  const ref = useRef<HTMLElement>(null)
  const state = useRef<HeaderScrollState>({hidden: false, lastY: 0})
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    // A reload can restore a mid-page scroll; start from it so the first upward scroll doesn't hide the bar.
    state.current = {...state.current, lastY: window.scrollY}

    const apply = (next: HeaderScrollState) => {
      state.current = next
      setHidden(next.hidden)
    }

    const locked = () => !!el.querySelector('[data-header-lock]') || !!el.querySelector(':focus-visible')

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        apply(nextHeaderScroll(state.current, {y: window.scrollY, locked: locked()}))
      })
    }
    const onReveal = () => apply({hidden: false, lastY: window.scrollY})
    // Keyboard focus only: a mouse click leaves focus on the link but must not lock or reveal.
    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as HTMLElement).matches(':focus-visible')) onReveal()
    }

    window.addEventListener('scroll', onScroll, {passive: true})
    window.addEventListener('hashchange', onReveal)
    el.addEventListener('focusin', onFocusIn)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onReveal)
      el.removeEventListener('focusin', onFocusIn)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      ref={ref}
      className={`sticky top-0 z-50 bg-background transition-transform duration-200 ease-out motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {children}
    </header>
  )
}
