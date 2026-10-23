/*
 * Filter tabs for archive grids. Everything lives in one file because scripts/verifyStaffFilter.mts
 * runs it under plain node, which cannot resolve extensionless relative imports (and tsc rejects
 * .ts ones).
 */

/** One tab of an archive's filter row: the slug is the stable key, the title the label. */
export type FilterTab = {slug: string; title: string}

/**
 * `orderRank` is the drag-and-drop position (a string that sorts lexically); `order` is the older
 * number, still used by taxonomies that are not draggable (property types, resources).
 */
export type Category = {
  slug?: string | null
  title?: string | null
  order?: number | null
  orderRank?: string | null
}

/**
 * Tabs for a set of categories: one per distinct category, in its own order (dragged rank, or the
 * older number) and then by title. A
 * category with no slug or title (an unpublished one dereferences to null) gets no tab.
 */
export function categoryTabs(categories: Iterable<Category | null | undefined>): FilterTab[] {
  const found = new Map<string, {title: string; order: number; rank: string | null}>()
  for (const category of categories) {
    const slug = category?.slug?.trim()
    const title = category?.title?.trim()
    if (!slug || !title || found.has(slug)) continue
    found.set(slug, {
      title,
      order: category?.order ?? Number.MAX_SAFE_INTEGER,
      rank: category?.orderRank || null,
    })
  }
  // A ranked category comes before an unranked one; two ranked ones compare by rank.
  const byRank = (a: string | null, b: string | null) =>
    a && b ? (a < b ? -1 : a > b ? 1 : 0) : a ? -1 : b ? 1 : 0
  return [...found.entries()]
    .sort(
      (a, b) =>
        byRank(a[1].rank, b[1].rank) || a[1].order - b[1].order || a[1].title.localeCompare(b[1].title),
    )
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

// Projects, by project type.

export const PROJECT_TYPE_PARAM = 'type'
export const PROJECT_FILTER_LABEL = 'Filter projects by type'

type WithProjectTypes = {projectTypes?: ReadonlyArray<Category | null> | null}

/** One tab per project type that at least one project has. */
export function projectTabs(projects: ReadonlyArray<WithProjectTypes>): FilterTab[] {
  return categoryTabs(projects.flatMap((project) => project.projectTypes ?? []))
}

export function filterByProjectType<T extends WithProjectTypes>(projects: T[], slug: string | null): T[] {
  return slug ? projects.filter((p) => p.projectTypes?.some((type) => type?.slug === slug)) : projects
}

export const parseProjectType = (search: string, tabs: ReadonlyArray<FilterTab>) =>
  parseFilter(search, PROJECT_TYPE_PARAM, tabs)

export const withProjectType = (search: string, slug: string | null) =>
  withFilter(search, PROJECT_TYPE_PARAM, slug)

// News, by category.

export const NEWS_CATEGORY_PARAM = 'category'
export const NEWS_FILTER_LABEL = 'Filter news by category'

type WithCategories = {categories?: ReadonlyArray<Category | null> | null}

/** One tab per news category that at least one article has. */
export function newsTabs(articles: ReadonlyArray<WithCategories>): FilterTab[] {
  return categoryTabs(articles.flatMap((article) => article.categories ?? []))
}

export function filterByNewsCategory<T extends WithCategories>(articles: T[], slug: string | null): T[] {
  return slug ? articles.filter((a) => a.categories?.some((category) => category?.slug === slug)) : articles
}

// --- Properties archive: two groups of multi-select filters ---------------------------------

export const PROPERTY_TYPE_PARAM = 'type'
export const PROPERTY_RESOURCE_PARAM = 'resource'

export type PropertySelection = {types: string[]; resources: string[]}
export const EMPTY_SELECTION: PropertySelection = {types: [], resources: []}

type MaybeCategory = Category | null
type Filterable = {
  propertyTypes?: ReadonlyArray<MaybeCategory> | null
  resources?: ReadonlyArray<MaybeCategory> | null
}

/** The Property Type options: one per type that at least one property has, in the type's own order. */
export const propertyTypeOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.propertyTypes ?? []))

/** The Resources options, built the same way. */
export const resourceOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.resources ?? []))

const hasAny = (categories: ReadonlyArray<MaybeCategory> | null | undefined, wanted: string[]) =>
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

// --- Public records: tabs by category, each category sorting and filtering its own way -------

export const RECORD_CATEGORY_PARAM = 'category'
export const RECORD_FILTER_LABEL = 'Filter records by category'

/**
 * A record category with its presentation settings. `sortBy` and `filters` arrive as plain
 * strings: the frontend ignores a value it does not know (a schema deployed before the frontend).
 */
export type RecordCategory = Category & {
  sortBy?: string | null
  filters?: ReadonlyArray<string | null> | null
}

export type RecordItem = {
  _id: string
  title?: string | null
  /** YYYY-MM-DD */
  date?: string | null
  fileName?: string | null
  fileUrl?: string | null
  categorySlug?: string | null
}

type RecordFilterDefinition = {
  /** The query-string parameter. */
  param: string
  label: string
  /** The choices this filter offers for a category's records. */
  options: (records: ReadonlyArray<RecordItem>) => FilterTab[]
  matches: (record: RecordItem, value: string) => boolean
}

const dateParts = (date: string | null | undefined) => /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')

const yearOf = (record: RecordItem) => dateParts(record.date)?.[1] ?? null

/**
 * Every record filter, by the key a category lists in its `filters`. Adding a filter is one entry
 * here plus one allowed value on `recordCategory.filters` in the studio (the two lists cannot
 * share code across packages). Nothing else, including the block and the hook, changes.
 */
export const RECORD_FILTERS = {
  year: {
    param: 'year',
    label: 'Year',
    options: (records) => {
      const years = new Set<string>()
      for (const record of records) {
        const year = yearOf(record)
        if (year) years.add(year)
      }
      return [...years].sort().reverse().map((year) => ({slug: year, title: year}))
    },
    matches: (record, value) => yearOf(record) === value,
  },
} satisfies Record<string, RecordFilterDefinition>

export type RecordFilterKey = keyof typeof RECORD_FILTERS

const isFilterKey = (key: string | null): key is RecordFilterKey =>
  key !== null && Object.prototype.hasOwnProperty.call(RECORD_FILTERS, key)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** A row's text: its title, else its date written out, else its file name. */
export function recordLabel(record: RecordItem): string {
  const title = record.title?.trim()
  if (title) return title
  const date = dateParts(record.date)
  if (date && Number(date[2]) >= 1 && Number(date[2]) <= 12) {
    return `${MONTHS[Number(date[2]) - 1]} ${Number(date[3])}, ${date[1]}`
  }
  return record.fileName?.trim() || 'Untitled record'
}

const compareLabels = (a: RecordItem, b: RecordItem) =>
  recordLabel(a).localeCompare(recordLabel(b), undefined, {sensitivity: 'base', numeric: true})

/** `titleAsc` is A-Z; anything else, including a value this code does not know, is newest first. */
function sortRecords(records: ReadonlyArray<RecordItem>, sortBy: string | null | undefined): RecordItem[] {
  const list = [...records]
  if (sortBy === 'titleAsc') return list.sort(compareLabels)
  // An undated record compares as '' so it sorts last when newest-first.
  return list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || compareLabels(a, b))
}

export type RecordFilterView = {
  key: RecordFilterKey
  param: string
  label: string
  options: FilterTab[]
  value: string | null
}

export type RecordView = {
  tabs: FilterTab[]
  category: RecordCategory | null
  filters: RecordFilterView[]
  records: RecordItem[]
}

/**
 * Everything the Records block shows for an address: the tabs, the active category (the first one
 * when the address names none, or an unknown one), the filters that category offers with their
 * choices, and its records, narrowed by the chosen filters and sorted as the category says.
 * A filter value the category does not offer is ignored.
 */
export function recordView(
  search: string,
  categories: ReadonlyArray<RecordCategory | null | undefined>,
  records: ReadonlyArray<RecordItem>,
): RecordView {
  const tabs = categoryTabs(categories)
  const slug = parseFilter(search, RECORD_CATEGORY_PARAM, tabs) ?? tabs[0]?.slug ?? null
  const category = slug ? (categories.find((candidate) => candidate?.slug?.trim() === slug) ?? null) : null
  if (!slug || !category) return {tabs, category: null, filters: [], records: []}

  const inCategory = records.filter((record) => record.categorySlug === slug)
  const keys = [...new Set(category.filters ?? [])].filter(isFilterKey)
  const filters = keys.map((key): RecordFilterView => {
    const definition = RECORD_FILTERS[key]
    const options = definition.options(inCategory)
    return {key, param: definition.param, label: definition.label, options, value: parseFilter(search, definition.param, options)}
  })

  let visible = inCategory
  for (const filter of filters) {
    const value = filter.value
    if (value) visible = visible.filter((record) => RECORD_FILTERS[filter.key].matches(record, value))
  }
  return {tabs, category, filters, records: sortRecords(visible, category.sortBy)}
}

/**
 * The query-string changes for choosing a category tab: set the category and clear every record
 * filter, so a year chosen on one tab cannot leave the next one empty. Apply with `withFilter`.
 */
export function recordCategoryPatch(slug: string): Record<string, string | null> {
  const cleared = Object.fromEntries(Object.values(RECORD_FILTERS).map((filter) => [filter.param, null]))
  return {...cleared, [RECORD_CATEGORY_PARAM]: slug}
}
