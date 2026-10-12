'use client'

import {useSearchParams} from 'next/navigation'

import {withFilter} from '@/sanity/lib/archiveFilter'

/**
 * The address's query string, and a way to change several parameters at once. Like useQueryFilter
 * (one parameter) it is read with useSearchParams and written with the History API, so a filtered
 * view can be shared and no server request is made. `update` sets a parameter to a value, or
 * removes it with null, keeping every other parameter and the hash. Callers need a Suspense
 * boundary above them on a statically rendered page.
 */
export function useQueryFilters() {
  const searchParams = useSearchParams()
  const search = `?${searchParams.toString()}`

  function update(patch: Record<string, string | null>) {
    let query = window.location.search
    for (const [param, value] of Object.entries(patch)) query = withFilter(query, param, value)
    window.history.replaceState(null, '', `${window.location.pathname}${query}${window.location.hash}`)
  }

  return {search, update}
}
