import type {
  MapFiltersQueryResult,
  MapSettingsQueryResult,
  ProjectsQueryResult,
} from '@/sanity.types'

/**
 * Map types derived from the generated GROQ result types, so they cannot drift from the queries.
 *
 * This file used to hold hardcoded PropertyType / Resource unions and label maps. Those are now
 * propertyType and resource documents in Sanity - a category can be added or renamed without a
 * deploy, so the frontend must not restate the list.
 */

export type Project = ProjectsQueryResult[number]
export type MapFilters = MapFiltersQueryResult
export type MapSettings = NonNullable<MapSettingsQueryResult>

/** A filter option as the dropdowns consume it. */
export type FilterOption = {value: string; label: string}

/** Fallback view when Project Settings has no default centre, i.e. the whole island. */
export const NANTUCKET_CENTER: [number, number] = [-70.0995, 41.2835]
export const DEFAULT_ZOOM = 11

/**
 * Turn taxonomy documents into dropdown options. A dereferenced entry is null when its document is
 * unpublished, so those are dropped rather than rendered as a blank option.
 */
export function toFilterOptions(
  entries: {slug: string; title: string}[] | null | undefined,
): FilterOption[] {
  return (entries ?? [])
    .filter((entry) => Boolean(entry?.slug))
    .map((entry) => ({value: entry.slug, label: entry.title}))
}

/**
 * Convert a Sanity geopoint to a Mapbox [lng, lat] pair.
 *
 * Returns null unless both coordinates are present: on the generated type they are optional, and
 * defaulting a missing one to 0 would silently place the point in the Atlantic rather than
 * revealing that the data is incomplete.
 */
export function toLngLat(
  point: {lat?: number; lng?: number} | null | undefined,
): [number, number] | null {
  if (typeof point?.lng !== 'number' || typeof point?.lat !== 'number') return null
  return [point.lng, point.lat]
}

/** The taxonomy slugs attached to a project, for filter matching. */
export function projectSlugs(
  entries: {slug: string; title: string}[] | null | undefined,
): string[] {
  return (entries ?? []).filter((entry) => Boolean(entry?.slug)).map((entry) => entry.slug)
}
