/**
 * Bounds of the trails GeoJSON, computed off the main thread.
 *
 * The file is several MB; `response.json()` on the page blocks it for the whole parse. A throwaway
 * Web Worker fetches the file once, parses a clone of it for the bounding box, and posts back the
 * bounds together with the raw response as a Blob. The caller gives the map an object URL for that
 * Blob, so Mapbox's own worker parses it for drawing without a second download (a second request
 * to the original URL is not reliably served from the HTTP cache, notably on a cold load) and the
 * page never parses it.
 *
 * The worker is built from a Blob so it needs no bundler support, which means its source must be
 * self-contained: it cannot reference anything in this module.
 */

export type TrailsBounds = [[number, number], [number, number]]

export type TrailsResult = {
  /** Null when the file has no line geometry. */
  bounds: TrailsBounds | null
  /** The file as downloaded, for the caller to hand to the map via an object URL. */
  blob: Blob
}

export type TrailsBoundsRequest = {
  /** Resolves with the bounds and the file, or rejects on failure. */
  promise: Promise<TrailsResult>
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
    const blob = await response.clone().blob()
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
    self.postMessage({bounds: west <= east ? [[west, south], [east, north]] : null, blob})
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

  const promise = new Promise<TrailsResult>((resolve, reject) => {
    try {
      // The worker has no base URL of its own, so hand it an absolute address.
      const absoluteUrl = new URL(url, window.location.href).href
      blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], {type: 'text/javascript'}))
      worker = new Worker(blobUrl)
      worker.onmessage = (
        event: MessageEvent<{bounds?: TrailsBounds | null; blob?: Blob; error?: string}>,
      ) => {
        const {bounds, blob, error} = event.data
        cancel()
        if (error || !blob) reject(new Error(error ?? 'The trails worker returned no data.'))
        else resolve({bounds: bounds ?? null, blob})
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
