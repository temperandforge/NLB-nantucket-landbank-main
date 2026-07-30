'use client'

import {useMemo} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'

import {MapboxMap} from './MapboxMap'
import {MultiSelectDropdown} from './MultiSelectDropdown'
import {
  projectSlugs,
  toFilterOptions,
  type FilterOption,
  type MapFilters,
  type MapSettings,
  type Project,
} from './types'

/**
 * The interactive map's filtering UI.
 *
 * Client-side because the selected filters live in the URL and update without a navigation. The
 * data itself is fetched on the server and passed in - see page.tsx.
 *
 * Filter options come from the propertyType and resource documents rather than a hardcoded list,
 * so a category the client adds in the Studio appears here without a deploy.
 */

interface MapExplorerProps {
  projects: Project[]
  filters: MapFilters
  settings: MapSettings | null
}

function parseParam(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export function MapExplorer({projects, filters, settings}: MapExplorerProps) {
  const router = useRouter()
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
    router.replace(query ? `/map?${query}` : '/map', {scroll: false})
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

  // Labels are looked up from the options rather than a parallel map, so a filter left in the URL
  // for a category that has since been deleted still shows something meaningful.
  function labelFor(options: FilterOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value
  }

  const activeFilters = [
    ...selectedPropertyTypes.map((value) => ({
      group: 'propertyType' as const,
      value,
      label: labelFor(propertyTypeOptions, value),
    })),
    ...selectedResources.map((value) => ({
      group: 'resource' as const,
      value,
      label: labelFor(resourceOptions, value),
    })),
  ]

  function removeFilter(group: 'propertyType' | 'resource', value: string) {
    if (group === 'propertyType') {
      updateParams({propertyType: selectedPropertyTypes.filter((v) => v !== value)})
    } else {
      updateParams({resources: selectedResources.filter((v) => v !== value)})
    }
  }

  function clearAll() {
    updateParams({propertyType: [], resources: []})
  }

  return (
    <div id="mapWrap" className="container flex flex-col px-5">
      <div className="flex flex-col gap-3 border-b border-neutral-200 bg-white py-4 sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-950">
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
        <span className="flex items-center text-sm text-neutral-500">
          {filteredProjects.length} of {projects.length} properties
        </span>
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-blue-600 hover:underline sm:ml-auto dark:text-blue-400"
          >
            Clear all
          </button>
        )}
      </div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
          {activeFilters.map((filter) => (
            <span
              key={`${filter.group}-${filter.value}`}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              {filter.label}
              <button
                type="button"
                onClick={() => removeFilter(filter.group, filter.value)}
                aria-label={`Remove ${filter.label} filter`}
                className="flex size-4 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-300 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <MapboxMap projects={filteredProjects} settings={settings} />
      </div>
    </div>
  )
}
