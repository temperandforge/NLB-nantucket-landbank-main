import {type FilterTab, categoryTabs} from './archiveFilter.ts'

export const PROPERTY_TYPE_PARAM = 'type'
export const PROPERTY_RESOURCE_PARAM = 'resource'

export type PropertySelection = {types: string[]; resources: string[]}
export const EMPTY_SELECTION: PropertySelection = {types: [], resources: []}

type Category = {slug?: string | null; title?: string | null; order?: number | null} | null
type Filterable = {
  propertyTypes?: ReadonlyArray<Category> | null
  resources?: ReadonlyArray<Category> | null
}

/** The Property Type options: one per type that at least one property has, in the type's own order. */
export const propertyTypeOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.propertyTypes ?? []))

/** The Resources options, built the same way. */
export const resourceOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.resources ?? []))

const hasAny = (categories: ReadonlyArray<Category> | null | undefined, wanted: string[]) =>
  wanted.length === 0 || (categories ?? []).some((category) => category?.slug && wanted.includes(category.slug))

/**
 * The properties that match: any of the chosen options within a group, and every group that has a
 * choice. A group with no choice adds no condition.
 */
export function filterProperties<T extends Filterable>(properties: T[], selection: PropertySelection): T[] {
  return properties.filter(
    (property) => hasAny(property.propertyTypes, selection.types) && hasAny(property.resources, selection.resources),
  )
}

export const hasSelection = (selection: PropertySelection) =>
  selection.types.length > 0 || selection.resources.length > 0

export const toggleSlug = (list: string[], slug: string): string[] =>
  list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug]

function read(params: URLSearchParams, param: string, options: ReadonlyArray<FilterTab>): string[] {
  const asked = (params.get(param) ?? '').split(',')
  // Option order, each once, only slugs the group actually offers.
  return options.map((option) => option.slug).filter((slug) => asked.includes(slug))
}

/** The selection in an address's query string; unknown, blank and repeated slugs are dropped. */
export function parseSelection(
  search: string,
  typeOptions: ReadonlyArray<FilterTab>,
  resourceChoices: ReadonlyArray<FilterTab>,
): PropertySelection {
  const params = new URLSearchParams(search)
  return {
    types: read(params, PROPERTY_TYPE_PARAM, typeOptions),
    resources: read(params, PROPERTY_RESOURCE_PARAM, resourceChoices),
  }
}

/**
 * A query string with the selection set (a group with no choice is removed), keeping every other
 * parameter. Returns '' or a string starting with '?'. Slugs are joined with literal commas.
 */
export function withSelection(search: string, selection: PropertySelection): string {
  const params = new URLSearchParams(search)
  params.delete(PROPERTY_TYPE_PARAM)
  params.delete(PROPERTY_RESOURCE_PARAM)
  const parts = [params.toString()]
  const write = (param: string, slugs: string[]) => {
    if (slugs.length > 0) parts.push(`${param}=${slugs.map(encodeURIComponent).join(',')}`)
  }
  write(PROPERTY_TYPE_PARAM, selection.types)
  write(PROPERTY_RESOURCE_PARAM, selection.resources)
  const query = parts.filter(Boolean).join('&')
  return query ? `?${query}` : ''
}
