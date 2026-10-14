/**
 * The properties shown under a property page: those sharing the most property types with it first,
 * then the newest. Pure, so scripts/verifyRelatedProperties.mts can check it. The page fetches every
 * other property (there are few) and trims here, rather than ordering in GROQ, so the ordering is
 * checked by something that runs.
 */
export function orderRelatedProperties<
  T extends {propertyTypeIds?: string[] | null; _createdAt: string},
>(properties: readonly T[], typeIds: readonly string[], count: number): T[] {
  const wanted = new Set(typeIds)
  const shared = (property: T) => (property.propertyTypeIds ?? []).filter((id) => wanted.has(id)).length
  return [...properties]
    .sort((a, b) => shared(b) - shared(a) || b._createdAt.localeCompare(a._createdAt))
    .slice(0, Math.max(count, 0))
}
