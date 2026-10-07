/*
 * Filter tabs for archive grids. Everything lives in one file because scripts/verifyStaffFilter.mts
 * runs it under plain node, which cannot resolve extensionless relative imports (and tsc rejects
 * .ts ones).
 */

/** One tab of an archive's filter row: the slug is the stable key, the title the label. */
export type FilterTab = {slug: string; title: string}

export type Category = {slug?: string | null; title?: string | null; order?: number | null}

/**
 * Tabs for a set of categories: one per distinct category, in its own order and then by title. A
 * category with no slug or title (an unpublished one dereferences to null) gets no tab.
 */
export function categoryTabs(categories: Iterable<Category | null | undefined>): FilterTab[] {
  const found = new Map<string, {title: string; order: number}>()
  for (const category of categories) {
    const slug = category?.slug?.trim()
    const title = category?.title?.trim()
    if (!slug || !title || found.has(slug)) continue
    found.set(slug, {title, order: category?.order ?? Number.MAX_SAFE_INTEGER})
  }
  return [...found.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[1].title.localeCompare(b[1].title))
    .map(([slug, {title}]) => ({slug, title}))
}

/** The filter chosen in an address's query string, or null when absent, blank or unknown. */
export function parseFilter(search: string, param: string, tabs: ReadonlyArray<FilterTab>): string | null {
  const value = new URLSearchParams(search).get(param)
  return value && tabs.some((tab) => tab.slug === value) ? value : null
}

/**
 * A query string with the filter set (or cleared, with null), keeping every other parameter.
 * Returns '' or a string starting with '?'.
 */
export function withFilter(search: string, param: string, slug: string | null): string {
  const params = new URLSearchParams(search)
  params.delete(param)
  const others = params.toString()
  if (!slug) return others ? `?${others}` : ''
  return `?${others ? `${others}&` : ''}${param}=${encodeURIComponent(slug)}`
}

// Staff, by department.

export const DEPARTMENT_PARAM = 'department'
export const DEPARTMENT_FILTER_LABEL = 'Filter staff by department'

type WithDepartment = {department?: Category | null}

/**
 * The department tabs for a list of staff: one per department that has at least one member.
 * Staff with no department (or an unpublished one) appear only under "All".
 */
export function departmentTabs(people: ReadonlyArray<WithDepartment>): FilterTab[] {
  return categoryTabs(people.map((person) => person.department))
}

export function filterByDepartment<T extends WithDepartment>(people: T[], slug: string | null): T[] {
  return slug ? people.filter((person) => person.department?.slug === slug) : people
}

export const parseDepartment = (search: string, tabs: ReadonlyArray<FilterTab>) =>
  parseFilter(search, DEPARTMENT_PARAM, tabs)

export const withDepartment = (search: string, slug: string | null) =>
  withFilter(search, DEPARTMENT_PARAM, slug)

// Projects, by property type.

export const PROJECT_TYPE_PARAM = 'type'
export const PROJECT_FILTER_LABEL = 'Filter projects by type'

type WithPropertyTypes = {propertyTypes?: ReadonlyArray<Category | null> | null}

/** One tab per property type that at least one project has. Resources (amenities) get none. */
export function projectTabs(projects: ReadonlyArray<WithPropertyTypes>): FilterTab[] {
  return categoryTabs(projects.flatMap((project) => project.propertyTypes ?? []))
}

export function filterByPropertyType<T extends WithPropertyTypes>(projects: T[], slug: string | null): T[] {
  return slug ? projects.filter((p) => p.propertyTypes?.some((type) => type?.slug === slug)) : projects
}

export const parseProjectType = (search: string, tabs: ReadonlyArray<FilterTab>) =>
  parseFilter(search, PROJECT_TYPE_PARAM, tabs)

export const withProjectType = (search: string, slug: string | null) =>
  withFilter(search, PROJECT_TYPE_PARAM, slug)
