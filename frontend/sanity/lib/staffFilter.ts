export type DepartmentTab = {slug: string; title: string}

type WithDepartment = {
  department?: {slug?: string | null; title?: string | null; order?: number | null} | null
}

/**
 * The department tabs for a list of staff: one per department that has at least one member, in the
 * department's own order and then by title. A department with no slug or title (an unpublished
 * department dereferences to null) gets no tab, and neither do staff with no department: they
 * appear only under "All".
 */
export function departmentTabs(people: ReadonlyArray<WithDepartment>): DepartmentTab[] {
  const found = new Map<string, {title: string; order: number}>()
  for (const {department} of people) {
    const slug = department?.slug?.trim()
    const title = department?.title?.trim()
    if (!slug || !title || found.has(slug)) continue
    found.set(slug, {title, order: department?.order ?? Number.MAX_SAFE_INTEGER})
  }
  return [...found.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[1].title.localeCompare(b[1].title))
    .map(([slug, {title}]) => ({slug, title}))
}

export function filterByDepartment<T extends WithDepartment>(people: T[], slug: string | null): T[] {
  return slug ? people.filter((person) => person.department?.slug === slug) : people
}

/** The department chosen in an address's query string, or null when absent, blank or unknown. */
export function parseDepartment(search: string, tabs: ReadonlyArray<DepartmentTab>): string | null {
  const value = new URLSearchParams(search).get('department')
  return value && tabs.some((tab) => tab.slug === value) ? value : null
}

export function departmentSearch(slug: string | null): string {
  return slug ? `?department=${encodeURIComponent(slug)}` : ''
}
