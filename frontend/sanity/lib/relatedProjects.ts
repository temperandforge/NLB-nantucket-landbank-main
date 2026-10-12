/**
 * The projects shown under a project page: those sharing the most project types with it first,
 * then the newest. Pure, so scripts/verifyRelatedProjects.mts can check it. The page fetches every
 * other project (there are few) and trims here, rather than ordering in GROQ, so the ordering is
 * checked by something that runs.
 */
export function orderRelatedProjects<
  T extends {projectTypeIds?: string[] | null; _createdAt: string},
>(projects: readonly T[], typeIds: readonly string[], count: number): T[] {
  const wanted = new Set(typeIds)
  const shared = (project: T) => (project.projectTypeIds ?? []).filter((id) => wanted.has(id)).length
  return [...projects]
    .sort((a, b) => shared(b) - shared(a) || b._createdAt.localeCompare(a._createdAt))
    .slice(0, Math.max(count, 0))
}
