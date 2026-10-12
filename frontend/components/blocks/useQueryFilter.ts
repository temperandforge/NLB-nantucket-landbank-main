'use client'

import {useSearchParams} from 'next/navigation'

import {type FilterTab, parseFilter, withFilter} from '@/sanity/lib/archiveFilter'

/**
 * The filter chosen for an archive grid, kept in the address as ?<param>=<slug> so a filtered view
 * can be shared. It is read with useSearchParams and changed with the History API, which Next
 * keeps in sync: no navigation and no server request. Callers need a Suspense boundary above them
 * on a statically rendered page.
 */
export function useQueryFilter(param: string, tabs: ReadonlyArray<FilterTab>) {
  const searchParams = useSearchParams()
  const active = parseFilter(`?${searchParams.toString()}`, param, tabs)

  function choose(slug: string | null) {
    // Keep any other query parameters and the hash; only this filter changes.
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${withFilter(window.location.search, param, slug)}${window.location.hash}`,
    )
  }

  return {active, choose}
}
