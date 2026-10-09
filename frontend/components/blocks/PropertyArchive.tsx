import {Suspense} from 'react'

import {EMPTY_SELECTION, propertyTypeOptions, resourceOptions} from '@/sanity/lib/archiveFilter'

import PropertyArchiveView from './PropertyArchiveView'
import PropertyFilter from './PropertyFilter'
import {BlockProps} from './types'

export default function PropertyArchive({block}: BlockProps<'propertyArchive'>) {
  const properties = block.properties ?? []
  if (properties.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {/* useSearchParams needs a Suspense boundary on a statically rendered page. The fallback is
            the same menus and grid with nothing selected, so the server HTML is the full list. */}
        <Suspense
          fallback={
            <PropertyArchiveView
              properties={properties}
              defaultImage={block.defaultImage}
              typeOptions={propertyTypeOptions(properties)}
              resourceOptions={resourceOptions(properties)}
              selection={EMPTY_SELECTION}
            />
          }
        >
          <PropertyFilter properties={properties} defaultImage={block.defaultImage} />
        </Suspense>
      </div>
    </section>
  )
}
