'use client'

import {useMemo} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import {LazyMapboxMap} from './LazyMapboxMap'
import {MultiSelectDropdown} from './MultiSelectDropdown'
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

function parseParam(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function MapExplorer({projects, filters, settings}: MapExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const propertyTypeOptions = useMemo(() => toFilterOptions(filters.propertyTypes), [filters])
  const resourceOptions = useMemo(() => toFilterOptions(filters.resources), [filters])

  const selectedPropertyTypes = useMemo(
    () => parseParam(searchParams.get('propertyType')),
    [searchParams],
  )
  const selectedResources = useMemo(() => parseParam(searchParams.get('resources')), [searchParams])

  function updateParams(next: {propertyType?: string[]; resources?: string[]}) {
    const params = new URLSearchParams(searchParams.toString())
    const nextPropertyTypes = next.propertyType ?? selectedPropertyTypes
    const nextResources = next.resources ?? selectedResources

    if (nextPropertyTypes.length > 0) {
      params.set('propertyType', nextPropertyTypes.join(','))
    } else {
      params.delete('propertyType')
    }

    if (nextResources.length > 0) {
      params.set('resources', nextResources.join(','))
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
      <div id="mapWrap" className="tf-max-w flex flex-col gap-10 py-10">
        <div className="container--inner flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MultiSelectDropdown
              label="Property Type"
              options={propertyTypeOptions}
              selected={selectedPropertyTypes}
              onChange={(values) => updateParams({propertyType: values})}
            />
            <MultiSelectDropdown
              label="Resources"
              options={resourceOptions}
              selected={selectedResources}
              onChange={(values) => updateParams({resources: values})}
            />
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-sm font-medium text-error hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 sm:ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        {/* close .container--inner */}
        <div className="relative flex-1">
          <LazyMapboxMap projects={filteredProjects} settings={settings} />
        </div>
      </div>
    </div>
  )
}
