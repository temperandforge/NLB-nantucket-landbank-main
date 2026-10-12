import {stegaClean} from 'next-sanity'
import {Suspense} from 'react'

import {recordView} from '@/sanity/lib/archiveFilter'

import RecordsFilter from './RecordsFilter'
import RecordsList from './RecordsList'
import {BlockProps} from './types'

export default function RecordsArchive({block}: BlockProps<'recordsArchive'>) {
  // stegaClean: in Presentation, string values carry invisible characters, so a filter key like
  // "year" would not match the registry and the category would show no filter dropdown.
  const categories = (block.categories ?? []).map((category) => ({
    ...category,
    sortBy: stegaClean(category.sortBy),
    filters: category.filters?.map((filter) => stegaClean(filter)),
  }))
  const records = block.records ?? []
  // Nothing to show without a category: degrade, do not throw.
  if (categories.length === 0) return null

  return (
    <section className="bg-background py-s6">
      <div className="flex w-full flex-col items-start gap-10 _tf-max-w">
        {/* useSearchParams needs a Suspense boundary on a statically rendered page. The fallback is
            the same view for an address with no query, which is what the server renders, so the
            page does not shift when the client takes over. */}
        <Suspense fallback={<RecordsList view={recordView('', categories, records)} />}>
          <RecordsFilter categories={categories} records={records} />
        </Suspense>
      </div>
    </section>
  )
}
