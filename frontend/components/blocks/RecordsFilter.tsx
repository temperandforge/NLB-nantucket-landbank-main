'use client'

import {type RecordCategory, type RecordItem, recordCategoryPatch, recordView} from '@/sanity/lib/archiveFilter'

import RecordsList from './RecordsList'
import {useQueryFilters} from './useQueryFilters'

/** The records with their tabs and filters driven by the address (?category=, ?year=). */
export default function RecordsFilter({categories, records}: {categories: RecordCategory[]; records: RecordItem[]}) {
  const {search, update} = useQueryFilters()
  const view = recordView(search, categories, records)

  return (
    <RecordsList
      view={view}
      onChooseCategory={(slug) => update(recordCategoryPatch(slug))}
      onChooseFilter={(param, value) => update({[param]: value})}
    />
  )
}
