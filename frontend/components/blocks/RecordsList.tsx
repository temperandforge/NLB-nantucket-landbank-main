import FilterTabs from '@/components/ui/FilterTabs'
import {RECORD_FILTER_LABEL, type RecordView} from '@/sanity/lib/archiveFilter'

import RecordFilterMenu from './RecordFilterMenu'
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
  onChooseFilter?: (param: string, value: string | null) => void
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
        padInside
        onChoose={onChooseCategory ? (slug) => slug && onChooseCategory(slug) : undefined}
      />
      {/* The same nesting as the heroes and the commissioners grid: the page padding on the same
          element as the max width, so the content sits under the hero heading at every width. With
          the padding on an outer element instead, the content would sit at the edge of the max-width
          box, 40px left of the heading once the viewport is wider than the box. */}
      <div className="tf-max-w tf-px flex flex-col items-start gap-12">
        {filters.map((filter) => (
          <RecordFilterMenu
            key={filter.key}
            label={filter.label}
            options={filter.options}
            value={filter.value}
            onChange={onChooseFilter ? (value) => onChooseFilter(filter.param, value) : undefined}
          />
        ))}
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
  )
}
