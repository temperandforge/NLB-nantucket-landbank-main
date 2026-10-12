'use client'

import CardProperty from '@/components/cards/CardProperty'
import type {PropertyDefaultImage, PropertyItem} from '@/components/cards/types'
import {
  EMPTY_SELECTION,
  type FilterTab,
  type PropertySelection,
  filterProperties,
  hasSelection,
} from '@/sanity/lib/archiveFilter'

import PropertyFilterMenu from './PropertyFilterMenu'

/**
 * The filter menus and the card grid. A client component only for the menus' open state, so the
 * server renders it too: the Suspense fallback is this view with nothing selected and no
 * `onChange`, which keeps the page from shifting when the real filter takes over.
 */
export default function PropertyArchiveView({
  properties,
  defaultImage,
  typeOptions,
  resourceOptions,
  selection,
  onChange,
}: {
  properties: PropertyItem[]
  defaultImage: PropertyDefaultImage
  typeOptions: FilterTab[]
  resourceOptions: FilterTab[]
  selection: PropertySelection
  onChange?: (next: PropertySelection) => void
}) {
  const shown = filterProperties(properties, selection)
  return (
    <div className="flex w-full flex-col items-start gap-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <PropertyFilterMenu
          label="Property Type"
          options={typeOptions}
          selected={selection.types}
          onChange={onChange && ((types) => onChange({...selection, types}))}
        />
        <PropertyFilterMenu
          label="Resources"
          options={resourceOptions}
          selected={selection.resources}
          onChange={onChange && ((resources) => onChange({...selection, resources}))}
        />
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p role="status" className="font-sans text-body-base text-on-background">
            No properties match these filters.
          </p>
          {hasSelection(selection) && onChange && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_SELECTION)}
              className="cursor-pointer font-mono text-body-base underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
          {shown.map((property) => (
            <li key={property._id}>
              <CardProperty property={property} defaultImage={defaultImage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
