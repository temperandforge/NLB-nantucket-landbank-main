/**
 * Pure planning for the project -> property migration (migrateProjectsToProperties.ts). No
 * imports, so the check script can load it directly (verifyProjectMigration.mts).
 */

export type SourceDoc = {
  _id: string
  _type: string
  name?: string
  slug?: {current?: string} | null
  [field: string]: unknown
}

type Fields = Record<string, unknown>

export type PlannedProperty = {
  slug: string
  name: string
  /** The project's id with any `drafts.` prefix removed. */
  sourceId: string
  published?: Fields
  draft?: Fields
}

/** Every field a property carries over from its project; anything else is dropped. */
export const COPIED_FIELDS = [
  'name',
  'slug',
  'image',
  'description',
  'link',
  'propertyTypes',
  'resources',
  'boundaryId',
  'location',
] as const

const isDraft = (id: string) => id.startsWith('drafts.')
const baseId = (id: string) => id.replace(/^drafts\./, '')

function copyFields(doc: SourceDoc): Fields {
  const out: Fields = {}
  for (const field of COPIED_FIELDS) {
    const value = doc[field]
    if (value !== undefined && value !== null) out[field] = value
  }
  return out
}

/**
 * One planned property per project, in the same publish state: a published project is created
 * published, a project with unpublished edits also gets that draft, a draft-only project is only
 * a draft. A project and its draft share a base id, so they are one property. Matching is by
 * slug: a slug that already has a property is skipped, and so is a second project reusing a slug.
 */
export function planProperties(
  docs: SourceDoc[],
  existingSlugs: ReadonlySet<string>,
): {create: PlannedProperty[]; skipped: Array<{slug: string; reason: string}>; issues: string[]} {
  const groups = new Map<string, {published?: SourceDoc; draft?: SourceDoc}>()
  for (const doc of docs) {
    const group = groups.get(baseId(doc._id)) ?? {}
    if (isDraft(doc._id)) group.draft = doc
    else group.published = doc
    groups.set(baseId(doc._id), group)
  }

  const create: PlannedProperty[] = []
  const skipped: Array<{slug: string; reason: string}> = []
  const issues: string[] = []
  const seen = new Set<string>()

  for (const [id, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const latest = group.draft ?? group.published
    const slug = latest?.slug?.current?.trim()
    if (!slug) {
      issues.push(`${id}: has no slug, not migrated`)
      continue
    }
    if (seen.has(slug)) {
      issues.push(`${id}: slug "${slug}" is already used by another project, not migrated`)
      continue
    }
    seen.add(slug)
    if (existingSlugs.has(slug)) {
      skipped.push({slug, reason: 'a property with this slug already exists'})
      continue
    }
    create.push({
      slug,
      name: String(latest?.name ?? slug),
      sourceId: id,
      ...(group.published ? {published: copyFields(group.published)} : {}),
      ...(group.draft ? {draft: copyFields(group.draft)} : {}),
    })
  }
  return {create, skipped, issues}
}
