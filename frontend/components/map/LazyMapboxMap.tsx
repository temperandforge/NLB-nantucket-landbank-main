'use client'

import dynamic from 'next/dynamic'
import {useEffect, useRef, useState, type ComponentProps} from 'react'

import {loadBoundaryIndex} from './boundaries'

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

  const boundaryUrl = props.settings?.boundaryDataUrl ?? null
  const idProperty = props.settings?.boundaryIdProperty ?? 'FID'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    let cancelIdle = () => {}

    // Near the viewport is not enough on a page where the map is already there on arrival: the
    // map's JavaScript, WebGL setup and style would compete with hydration and the first paint. So
    // it waits for the page's own load to finish and the main thread to go idle, and the
    // boundary file is requested now, in parallel, so it is ready when the map is.
    const start = () => {
      loadBoundaryIndex(boundaryUrl, idProperty)
      const finish = () => {
        if (!cancelled) setNear(true)
      }
      const run = () => {
        // Safari has no requestIdleCallback; the declared type says it always exists.
        const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined
        if (idle) {
          const id = idle(finish, {timeout: 2000})
          cancelIdle = () => window.cancelIdleCallback(id)
        } else {
          const id = window.setTimeout(finish, 200)
          cancelIdle = () => window.clearTimeout(id)
        }
      }
      if (document.readyState === 'complete') run()
      else window.addEventListener('load', run, {once: true})
    }

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return () => {
        cancelled = true
        cancelIdle()
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          start()
        }
      },
      {rootMargin: NEAR},
    )
    observer.observe(el)
    return () => {
      cancelled = true
      cancelIdle()
      observer.disconnect()
    }
  }, [boundaryUrl, idProperty])

  return (
    <div ref={ref} className="h-full w-full bg-on-background-tonal">
      {near ? <MapboxMap {...props} /> : null}
    </div>
  )
}
