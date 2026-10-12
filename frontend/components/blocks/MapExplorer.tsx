import {Suspense} from 'react'

import {MapExplorer} from '@/components/map/MapExplorer'

import {BlockProps} from './types'

/**
 * The Map Explorer block: the filterable map. The Suspense boundary is required because the
 * explorer reads its filters from useSearchParams.
 */
export default function MapExplorerBlock({block}: BlockProps<'mapExplorer'>) {
  return (
    <Suspense fallback={null}>
      <MapExplorer
        projects={block.properties ?? []}
        filters={block.filters}
        settings={block.settings ?? null}
      />
    </Suspense>
  )
}
