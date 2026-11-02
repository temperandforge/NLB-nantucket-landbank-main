'use client'

import {useEffect, useRef, useState} from 'react'

import {DEFAULT_TOP_OFFSET, nextHeaderScroll, type HeaderScrollState} from './headerScroll'

/**
 * Sticky wrapper that hides on scroll down and reveals on scroll up (rule in headerScroll.ts).
 * The optional `banner` sits above the bar inside the same sticky element, so the two stick and hide
 * together; it spans the full width, so the page gutters are on the inner wrapper, not on the header.
 *
 * "Locked" means a dropdown or the mobile panel is open (a descendant carries data-header-lock)
 * or keyboard focus is inside the header - in both cases the header must stay put. Anchor jumps
 * reveal it so focus is never left on a hidden element. One passive scroll listener, throttled
 * with requestAnimationFrame. The slide is removed under prefers-reduced-motion. While hidden it sets
 * --header-offset to 0 on <html>, so sticky content can move up into the freed space.
 */
export default function HeaderShell({banner, children}: {banner?: React.ReactNode; children: React.ReactNode}) {
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
      // Sticky content elsewhere on the page (the jump-nav column) sits below the header while it
      // shows and moves up into its space once it hides: it reads --header-offset, falling back to
      // --header-height before this runs.
      document.documentElement.style.setProperty(
        '--header-offset',
        next.hidden ? '0px' : 'var(--header-height)',
      )
    }

    const locked = () => !!el.querySelector('[data-header-lock]') || !!el.querySelector(':focus-visible')

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        apply(
          nextHeaderScroll(
            state.current,
            {y: window.scrollY, locked: locked()},
            {topOffset: DEFAULT_TOP_OFFSET},
          ),
        )
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
      document.documentElement.style.removeProperty('--header-offset')
    }
  }, [])

  return (
    <header
      ref={ref}
      // Its own view-transition group, held still by css/motion.css, so the bar never moves or
      // fades with the page handoff.
      style={{viewTransitionName: 'site-header'}}
      className={`sticky top-0 z-50 shadow-[inset_0_-1px_0_var(--color-border-light)] bg-background transition-transform duration-200 ease-out motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {banner}
      <div className="tf-px">{children}</div>
    </header>
  )
}
