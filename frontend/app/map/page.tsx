import {Suspense} from 'react'

import {sanityFetch} from '@/sanity/lib/live'
import {mapFiltersQuery, mapSettingsQuery, projectsQuery} from '@/sanity/lib/queries'

import {MapExplorer} from './MapExplorer'

/**
 * Interactive map.
 *
 * A server component that fetches the projects, the filter taxonomies and the map settings, then
 * hands them to the client component that owns filtering. The data used to be a hardcoded array in
 * ./properties.ts; it is now project / propertyType / resource documents in Sanity.
 *
 * The Suspense boundary is required because MapExplorer reads the filters from useSearchParams.
 */
export default async function MapPage() {
  const [{data: projects}, {data: filters}, {data: settings}] = await Promise.all([
    sanityFetch({query: projectsQuery}),
    sanityFetch({query: mapFiltersQuery}),
    sanityFetch({query: mapSettingsQuery}),
  ])

  return (
    <Suspense fallback={null}>
      <MapExplorer projects={projects ?? []} filters={filters} settings={settings} />
    </Suspense>
  )
}
