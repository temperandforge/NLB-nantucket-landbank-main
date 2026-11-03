'use client'

import dynamic from 'next/dynamic'
import {useEffect, useRef, useState, type ComponentProps} from 'react'

/**
 * mapbox-gl is about 500 KB of JavaScript (1.8 MB parsed). It is only fetched, with the map's CSS,
 * when this placeholder is within `NEAR` of the viewport, so a page whose map is far down (the home
 * page) doesn't pay for it up front, which matters most on a phone. ssr: false: the map only ever
 * draws in the browser.
 */
const MapboxMap = dynamic(() => import('./MapboxMap').then((m) => m.MapboxMap), {ssr: false})

/** How far outside the viewport the placeholder may be before the map starts loading. */
const NEAR = '600px 0px'

type Props = ComponentProps<typeof MapboxMap>

/**
 * A drop-in for MapboxMap that loads it near the viewport. It holds the map's space (`h-full
 * w-full`, as MapboxMap's own root does) so nothing shifts when the map arrives. Without
 * IntersectionObserver it loads at once.
 */
export function LazyMapboxMap(props: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      // No way to tell when it is near: load it. In a callback, not the effect body.
      const frame = requestAnimationFrame(() => setNear(true))
      return () => cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      {rootMargin: NEAR},
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="h-full w-full bg-on-background-tonal">
      {near ? <MapboxMap {...props} /> : null}
    </div>
  )
}
