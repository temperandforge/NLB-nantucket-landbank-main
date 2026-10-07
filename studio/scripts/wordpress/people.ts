/**
 * Pure transform from the WordPress extraction (extractPeople.php) to what the import writes.
 * No imports, so the check script can load it directly (verifyPeopleTransform.mts).
 */

export type SnapshotPhoto = {attachmentId: number; path: string; exists: boolean; alt: string}

export type SnapshotPerson = {
  wpId: number
  type: string
  status: string
  name: string
  slug: string
  menuOrder: number
  jobTitle: string
  termDate: string
  photo: SnapshotPhoto | null
}

export type Snapshot = {
  people: SnapshotPerson[]
  /** The previous theme's staff posts (same people), which carry the department assignments. */
  legacyStaffDepartments: Array<{wpId: number; name: string; department: {slug: string; name: string}}>
  departments: Array<{termId: number; slug: string; name: string}>
}

export type PlannedDepartment = {slug: string; title: string; order: number}

export type PlannedPerson = {
  wpId: number
  type: 'staffMember' | 'commissioner'
  name: string
  title?: string
  order: number
  departmentSlug?: string
  termDate?: string
  photoPath?: string
}

const NAMED: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '}

/** Decodes the HTML entities WordPress leaves in titles and term names ("&amp;", "&#8217;"). */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return NAMED[entity.toLowerCase()] ?? match
  })
}

function clean(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim()
}

/** The natural key for a person: case, spacing and entities do not matter. */
export function normalizeName(value: string): string {
  return clean(value).toLowerCase()
}

/** Departments in WordPress order (term id), spaced by 10 so one can be slotted in between later. */
export function planDepartments(departments: Snapshot['departments']): PlannedDepartment[] {
  return [...departments]
    .sort((a, b) => a.termId - b.termId)
    .map((department, index) => ({
      slug: department.slug,
      title: clean(department.name),
      order: (index + 1) * 10,
    }))
}

/**
 * The people to import, and everything worth a human's attention. A person that is not published,
 * or whose name repeats within its type, is not planned. A missing photo is not an error (two
 * staff have none, as in the design) but is reported, so it can be checked against the source.
 */
export function planPeople(snapshot: Snapshot): {people: PlannedPerson[]; issues: string[]} {
  const issues: string[] = []
  const people: PlannedPerson[] = []
  const seen = new Set<string>()
  const legacy = new Map<string, {slug: string; name: string}>()
  for (const row of snapshot.legacyStaffDepartments) {
    const key = normalizeName(row.name)
    if (!legacy.has(key)) legacy.set(key, row.department)
  }

  for (const source of snapshot.people) {
    const name = clean(source.name)
    if (source.type !== 'staff' && source.type !== 'commissioner') continue
    if (source.status !== 'publish') {
      issues.push(`${name}: not published (status ${source.status}), skipped`)
      continue
    }
    const key = `${source.type}:${normalizeName(source.name)}`
    if (seen.has(key)) {
      issues.push(`duplicate ${source.type} name ${name} (WordPress ${source.wpId}), skipped`)
      continue
    }
    seen.add(key)

    const person: PlannedPerson = {
      wpId: source.wpId,
      type: source.type === 'staff' ? 'staffMember' : 'commissioner',
      name,
      title: clean(source.jobTitle) || undefined,
      order: source.menuOrder,
    }

    if (source.type === 'staff') {
      const department = legacy.get(normalizeName(source.name))
      if (department) person.departmentSlug = department.slug
      else issues.push(`${name}: no department found on the legacy staff posts`)
    } else {
      person.termDate = clean(source.termDate) || undefined
    }

    if (!source.photo) {
      issues.push(`${name}: no photo`)
    } else if (!source.photo.exists) {
      issues.push(`${name}: photo file is missing (${source.photo.path})`)
    } else {
      person.photoPath = source.photo.path
    }
    people.push(person)
  }
  return {people, issues}
}
