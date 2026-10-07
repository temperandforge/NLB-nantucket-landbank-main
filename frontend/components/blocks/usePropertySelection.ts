'use client'

import {useSearchParams} from 'next/navigation'
import {useMemo} from 'react'

import {type FilterTab, type PropertySelection, parseSelection, withSelection} from '@/sanity/lib/archiveFilter'

/**
 * The property filter chosen, kept in the address as ?type=a,b&resource=c so a filtered view can
 * be shared. Read with useSearchParams and changed with the History API, like useQueryFilter:
 * no navigation, no server request. Callers need a Suspense boundary above them.
 */
export function usePropertySelection(typeOptions: FilterTab[], resourceOptions: FilterTab[]) {
  const searchParams = useSearchParams()
  const selection = useMemo(
    () => parseSelection(`?${searchParams.toString()}`, typeOptions, resourceOptions),
    [searchParams, typeOptions, resourceOptions],
  )

  function choose(next: PropertySelection) {
    // Keep any other query parameters and the hash; only the filters change.
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${withSelection(window.location.search, next)}${window.location.hash}`,
    )
  }

  return {selection, choose}
}
