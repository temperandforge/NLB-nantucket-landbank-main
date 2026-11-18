import FilterTabs from '@/components/ui/FilterTabs'
import {RECORD_FILTER_LABEL, type RecordView, toFilterOptions} from '@/sanity/lib/archiveFilter'

import {FilterDropdown} from '../FilterDropdown'
import RecordRow from './RecordRow'

/**
 * The tabs, the active category's filters and its records (Figma: records page filters, filter
 * buttons, the File Name / Download list). Presentational, so the server renders it for the
 * Suspense fallback. Without the handlers the controls do nothing (only until the page has loaded).
 */
export default function RecordsList({
  view,
  onChooseCategory,
  onChooseFilter,
}: {
  view: RecordView
  onChooseCategory?: (slug: string) => void
  onChooseFilter?: (param: string, value: string[]) => void
}) {
  const {tabs, category, filters, records} = view
  if (!category) return null

  return (
    <div className="flex w-full flex-col items-start gap-12 _tf-max-w md:gap-16">
      <FilterTabs
        tabs={tabs}
        active={category.slug ?? null}
        label={RECORD_FILTER_LABEL}
        showAll={false}
        onChoose={onChooseCategory ? (slug) => slug && onChooseCategory(slug) : undefined}
      />
      <div className="tf-px w-full">
        <div className="tf-max-w flex flex-col items-start gap-12">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            {filters.map((filter) => (
              <FilterDropdown
                key={filter.key}
                label={filter.label}
                options={toFilterOptions(filter.options)}
                hideWhenEmpty
                selected={filter.value}
                onChange={
                  onChooseFilter ? (value) => onChooseFilter(filter.param, value) : undefined
                }
              />
            ))}
          </div>
          <div className="flex w-full flex-col">
            <div className="flex w-full items-start justify-between py-6 font-mono text-body-small uppercase leading-[1.6] tracking-wide text-on-background">
              <span>File Name</span>
              <span>Download</span>
            </div>
            {records.length > 0 ? (
              <ul className="m-0 w-full list-none p-0">
                {records.map((record) => (
                  <RecordRow key={record._id} record={record} />
                ))}
              </ul>
            ) : (
              <p className="border-t border-border-light py-6 font-mono text-body-base text-on-background-subtle">
                No records in this category yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
