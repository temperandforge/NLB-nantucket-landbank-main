'use client'

import {useMemo} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import {LazyMapboxMap} from './LazyMapboxMap'
import {FilterDropdown} from '../FilterDropdown'
import {
  projectSlugs,
  toFilterOptions,
  type MapFilters,
  type MapSettings,
  type Property,
} from './types'

/**
 * The interactive map's filtering UI.
 *
 * Client-side because the selected filters live in the URL and update without a navigation. The
 * data itself is fetched on the server in the block's GROQ projection and passed in - see
 * components/blocks/MapExplorer.tsx.
 *
 * Filter options come from the propertyType and resource documents rather than a hardcoded list,
 * so a category the client adds in the Studio appears here without a deploy.
 */

interface MapExplorerProps {
  projects: Property[]
  filters: MapFilters
  settings: MapSettings | null
}

/**
 * The slugs in a comma-separated parameter, limited to ones that exist. An unknown slug (a typo, a
 * deleted category, a crawler's guess) is ignored rather than filtering the map down to nothing,
 * and duplicates are dropped. Order is not kept: see `serialize`.
 */
function parseParam(value: string | null, known: ReadonlySet<string>): string[] {
  if (!value) return []
  return [...new Set(value.split(',').filter((slug) => known.has(slug)))]
}

/** Sorted, so one filter state is one URL however the visitor picked the options. */
function serialize(slugs: string[]): string {
  return [...slugs].sort().join(',')
}

export function MapExplorer({projects, filters, settings}: MapExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const propertyTypeOptions = useMemo(() => toFilterOptions(filters.propertyTypes), [filters])
  const resourceOptions = useMemo(() => toFilterOptions(filters.resources), [filters])

  const selectedPropertyTypes = useMemo(
    () =>
      parseParam(searchParams.get('propertyType'), new Set(propertyTypeOptions.map((o) => o.value))),
    [searchParams, propertyTypeOptions],
  )
  const selectedResources = useMemo(
    () => parseParam(searchParams.get('resources'), new Set(resourceOptions.map((o) => o.value))),
    [searchParams, resourceOptions],
  )

  function updateParams(next: {propertyType?: string[]; resources?: string[]}) {
    const params = new URLSearchParams(searchParams.toString())
    const nextPropertyTypes = next.propertyType ?? selectedPropertyTypes
    const nextResources = next.resources ?? selectedResources

    if (nextPropertyTypes.length > 0) {
      params.set('propertyType', serialize(nextPropertyTypes))
    } else {
      params.delete('propertyType')
    }

    if (nextResources.length > 0) {
      params.set('resources', serialize(nextResources))
    } else {
      params.delete('resources')
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false})
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const types = projectSlugs(project.propertyTypes)
      const resources = projectSlugs(project.resources)

      const matchesPropertyType =
        selectedPropertyTypes.length === 0 ||
        types.some((type) => selectedPropertyTypes.includes(type))

      const matchesResource =
        selectedResources.length === 0 ||
        resources.some((resource) => selectedResources.includes(resource))

      return matchesPropertyType && matchesResource
    })
  }, [projects, selectedPropertyTypes, selectedResources])

  const hasFilters = selectedPropertyTypes.length > 0 || selectedResources.length > 0

  function clearAll() {
    updateParams({propertyType: [], resources: []})
  }

  return (
    // tf-px on the parent and tf-max-w inside, like the other blocks, so the filters and map sit
    // under the hero heading at every width. The starter's `container` class used a different max
    // width and padding, which left them left of the heading.
    <div className="tf-px w-full">
      <div id="mapWrap" className="tf-max-w flex flex-col gap-10 xl:pt-10 pb-s6">
        <div className="container--inner flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FilterDropdown
              label="Property Type"
              options={propertyTypeOptions}
              selected={selectedPropertyTypes}
              onChange={(values) => updateParams({propertyType: values})}
            />
            <FilterDropdown
              label="Resources"
              options={resourceOptions}
              selected={selectedResources}
              onChange={(values) => updateParams({resources: values})}
            />
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-sm font-medium text-error hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 sm:ml-2 max-sm:mt-2"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        {/* close .container--inner */}
        <div className="relative h-[428px] md:h-[738px]">
          <LazyMapboxMap projects={filteredProjects} settings={settings} />
        </div>
      </div>
    </div>
  )
}
