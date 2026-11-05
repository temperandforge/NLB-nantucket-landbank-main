/**
 * Bounds of the trails GeoJSON, computed off the main thread.
 *
 * The file is several MB; `response.json()` on the page blocks it for the whole parse. A throwaway
 * Web Worker fetches and parses it instead and posts back only the bounding box. The map itself is
 * given the file's URL, so Mapbox's own worker parses it again for drawing (the second download
 * comes from the HTTP cache).
 *
 * The worker is built from a Blob so it needs no bundler support, which means its source must be
 * self-contained: it cannot reference anything in this module.
 */

export type TrailsBounds = [[number, number], [number, number]]

export type TrailsBoundsRequest = {
  /** Resolves with the bounds, or null when the file has no line geometry. Rejects on failure. */
  promise: Promise<TrailsBounds | null>
  /** Terminates the worker and releases its Blob URL. Safe to call more than once. */
  cancel: () => void
}

const WORKER_SOURCE = `
self.onmessage = async (event) => {
  try {
    const response = await fetch(event.data)
    if (!response.ok) {
      self.postMessage({error: 'Could not download the trails GeoJSON (' + response.status + ').'})
      return
    }
    const data = await response.json()
    const features = Array.isArray(data && data.features) ? data.features : []
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
    const extend = (position) => {
      const lng = position[0], lat = position[1]
      if (lng < west) west = lng
      if (lng > east) east = lng
      if (lat < south) south = lat
      if (lat > north) north = lat
    }
    for (const feature of features) {
      const geometry = feature && feature.geometry
      if (!geometry) continue
      if (geometry.type === 'LineString') geometry.coordinates.forEach(extend)
      else if (geometry.type === 'MultiLineString')
        geometry.coordinates.forEach((line) => line.forEach(extend))
    }
    self.postMessage({bounds: west <= east ? [[west, south], [east, north]] : null})
  } catch (error) {
    self.postMessage({error: String(error && error.message ? error.message : error)})
  }
}
`

export function fetchTrailsBounds(url: string): TrailsBoundsRequest {
  let worker: Worker | null = null
  let blobUrl: string | null = null

  const cancel = () => {
    worker?.terminate()
    worker = null
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }

  const promise = new Promise<TrailsBounds | null>((resolve, reject) => {
    try {
      // The worker has no base URL of its own, so hand it an absolute address.
      const absoluteUrl = new URL(url, window.location.href).href
      blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], {type: 'text/javascript'}))
      worker = new Worker(blobUrl)
      worker.onmessage = (event: MessageEvent<{bounds?: TrailsBounds | null; error?: string}>) => {
        const {bounds, error} = event.data
        cancel()
        if (error) reject(new Error(error))
        else resolve(bounds ?? null)
      }
      worker.onerror = (event) => {
        cancel()
        reject(new Error(event.message || 'The trails worker failed.'))
      }
      worker.postMessage(absoluteUrl)
    } catch (error) {
      cancel()
      reject(error)
    }
  })

  return {promise, cancel}
}
