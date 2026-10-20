/**
 * Planning for generating `property` documents from the boundary file: one property per distinct
 * `Name` in the file, with `boundaryIds` set to every feature sharing that name.
 *
 * Pure (no client, no I/O) so `scripts/verifyPropertyGeneration.ts` can check the rules and
 * `scripts/generatePropertiesFromBoundaries.ts` can reuse them unchanged.
 *
 * It is create-only. A name that already has a property is left exactly as authored, and a name
 * whose boundaries are already assigned to some other property is reported, not created: assigning
 * a boundary twice draws two overlapping polygons.
 */

/** Marks a generated property as needing an editor's attention. The existing hand-made ones use it. */
export const REVIEW_SUFFIX = ' - Needs Review'

export type BoundaryFeature = {properties?: Record<string, unknown> | null}

export type ExistingProperty = {
  name?: string | null
  slug?: string | null
  boundaryIds?: string[] | null
}

export type PropertyToCreate = {name: string; slug: string; boundaryIds: string[]}

export type GenerationPlan = {
  create: PropertyToCreate[]
  /** Names that already have a property (by slug or by name), left untouched. */
  skippedExisting: string[]
  /** Names with a boundary already assigned to another property: not created, listed to resolve by hand. */
  conflicts: {name: string; taken: {id: string; owner: string}[]}[]
  /** Names whose slug is already used by a different name (here or among existing properties). */
  slugClashes: string[]
  /** Features with no usable name, which cannot be turned into a property. */
  unnamed: {id: string; acres: unknown; owner: unknown}[]
}

/** Same rule as the other seed scripts and the slugs of the properties made by hand. */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The feature's name: `Name` from the Esri attribute table, else `name` from a converted Placemark. */
function featureName(properties: Record<string, unknown>): string {
  const raw = properties.Name ?? properties.name
  return typeof raw === 'string' ? raw.trim() : ''
}

export function planPropertyGeneration(
  features: BoundaryFeature[],
  existing: ExistingProperty[],
  idProperty: string,
): GenerationPlan {
  const plan: GenerationPlan = {create: [], skippedExisting: [], conflicts: [], slugClashes: [], unnamed: []}

  // Who holds each boundary id already, and which slugs and names are taken.
  const ownerById = new Map<string, string>()
  const takenSlugs = new Set<string>()
  const takenNames = new Set<string>()
  for (const property of existing) {
    const name = property.name ?? 'an existing property'
    for (const id of property.boundaryIds ?? []) if (!ownerById.has(id)) ownerById.set(id, name)
    if (property.slug) takenSlugs.add(property.slug)
    if (property.name) takenNames.add(property.name.replace(REVIEW_SUFFIX, '').trim())
  }

  // Group boundary ids by name, in file order. An id is explicit-checked, never truthiness: FID 0 is real.
  const groups = new Map<string, string[]>()
  for (const feature of features) {
    const properties = feature.properties ?? {}
    const rawId = properties[idProperty]
    if (rawId === undefined || rawId === null || rawId === '') continue
    const id = String(rawId)
    const name = featureName(properties)
    if (!name) {
      plan.unnamed.push({id, acres: properties.Acres, owner: properties.Owner})
      continue
    }
    const ids = groups.get(name)
    if (ids) ids.push(id)
    else groups.set(name, [id])
  }

  const newSlugs = new Set<string>()
  for (const [name, ids] of groups) {
    const slug = slugifyName(name)

    if (takenSlugs.has(slug) || takenNames.has(name)) {
      plan.skippedExisting.push(name)
      continue
    }
    if (!slug || newSlugs.has(slug)) {
      plan.slugClashes.push(name)
      continue
    }

    const taken = ids.flatMap((id) => {
      const owner = ownerById.get(id)
      return owner ? [{id, owner}] : []
    })
    if (taken.length > 0) {
      plan.conflicts.push({name, taken})
      continue
    }

    newSlugs.add(slug)
    plan.create.push({name: `${name}${REVIEW_SUFFIX}`, slug, boundaryIds: ids})
  }

  return plan
}
