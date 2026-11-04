/**
 * The address of a document that lives at a fixed route, derived from its slug alone. Unlike a CMS
 * page, whose URL comes from its parent chain (DECISIONS 2), these types each own one route, so the
 * slug is enough. This file has no imports so scripts can load it; utils.ts re-exports it. Keep in
 * step with the Presentation routes in studio/sanity.config.ts.
 */

/** A project: app/projects/[slug]. */
export function projectHref(slug: string): string {
  return `/projects/${slug}`
}

/** A property: app/properties/[slug]. */
export function propertyHref(slug: string): string {
  return `/properties/${slug}`
}

/** A news article's own page: app/news/[slug]. An article with an external URL links there instead. */
export function articleHref(slug: string): string {
  return `/news/${slug}`
}

/** An event: app/events/[slug]. */
export function eventHref(slug: string): string {
  return `/events/${slug}`
}
