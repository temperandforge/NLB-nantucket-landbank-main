import type {SeoImage} from './seo'
import {absoluteUrl} from './siteUrl'

/**
 * schema.org JSON-LD, derived from documents the page has already fetched. Every builder is pure
 * and returns null when it lacks what the type requires, or when there is no site origin (a
 * structured-data URL must be absolute). A property with no value is left out, never emitted
 * empty, and nothing is invented to fill a gap. See DECISIONS 24.2.
 */

export type JsonLdGraph = Record<string, unknown>

const SITE_TIME_ZONE = 'America/New_York'

/** Drops keys whose value is missing, so a builder can list every property it knows about. */
function compact(graph: JsonLdGraph): JsonLdGraph {
  return Object.fromEntries(
    Object.entries(graph).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false
      if (Array.isArray(value)) return value.length > 0
      return true
    }),
  )
}

const withContext = (graph: JsonLdGraph): JsonLdGraph => ({'@context': 'https://schema.org', ...graph})

const organizationId = (origin: string) => `${origin}/#organization`

/**
 * An ISO instant rendered in the site time zone with its UTC offset, e.g. 2026-11-01T10:00:00-04:00.
 * Editors enter event times in America/New_York, so a bare UTC string would read as the wrong hour.
 */
export function toSiteIso(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const offset = get('timeZoneName').replace('GMT', '') || '+00:00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`
}

type OrganizationInput = {
  name?: string | null
  organization?: {
    legalName?: string | null
    email?: string | null
    telephone?: string | null
    address?: {
      streetAddress?: string | null
      addressLocality?: string | null
      addressRegion?: string | null
      postalCode?: string | null
    } | null
    sameAs?: (string | null)[] | null
  } | null
  /** The organization logo, already resolved to an absolute image URL. */
  logoUrl?: string | null
}

export function organizationLd(input: OrganizationInput, origin: string | null): JsonLdGraph | null {
  if (!origin) return null
  const name = input.organization?.legalName || input.name
  if (!name) return null
  const address = input.organization?.address
  const hasAddress = address && Object.values(address).some(Boolean)
  return withContext(
    compact({
      '@type': 'Organization',
      '@id': organizationId(origin),
      name,
      url: origin,
      logo: input.logoUrl,
      email: input.organization?.email,
      telephone: input.organization?.telephone,
      address: hasAddress
        ? compact({
            '@type': 'PostalAddress',
            streetAddress: address.streetAddress,
            addressLocality: address.addressLocality,
            addressRegion: address.addressRegion,
            postalCode: address.postalCode,
          })
        : undefined,
      sameAs: (input.organization?.sameAs ?? []).filter(Boolean),
    }),
  )
}

export function websiteLd(input: {name?: string | null; description?: string | null}, origin: string | null): JsonLdGraph | null {
  if (!origin || !input.name) return null
  return withContext(
    compact({
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: input.name,
      url: origin,
      description: input.description,
      publisher: {'@id': organizationId(origin)},
    }),
  )
}

type ImageInput = SeoImage | null | undefined

export function newsArticleLd(
  article: {title?: string | null; slug?: string | null; date?: string | null; description?: string | null; image?: ImageInput},
  origin: string | null,
): JsonLdGraph | null {
  if (!origin || !article.title || !article.slug) return null
  const url = absoluteUrl(`/news/${article.slug}`, origin)
  return withContext(
    compact({
      '@type': 'NewsArticle',
      headline: article.title,
      url,
      mainEntityOfPage: url,
      datePublished: article.date,
      description: article.description,
      image: article.image?.url,
      publisher: {'@id': organizationId(origin)},
    }),
  )
}

export function eventLd(
  event: {
    title?: string | null
    slug?: string | null
    start?: string | null
    end?: string | null
    location?: string | null
    description?: string | null
    image?: ImageInput
  },
  origin: string | null,
): JsonLdGraph | null {
  const startDate = toSiteIso(event.start)
  if (!origin || !event.title || !event.slug || !startDate) return null
  return withContext(
    compact({
      '@type': 'Event',
      name: event.title,
      url: absoluteUrl(`/events/${event.slug}`, origin),
      startDate,
      endDate: toSiteIso(event.end),
      location: event.location ? {'@type': 'Place', name: event.location} : undefined,
      description: event.description,
      image: event.image?.url,
      organizer: {'@id': organizationId(origin)},
    }),
  )
}

export function placeLd(
  property: {
    name?: string | null
    slug?: string | null
    description?: string | null
    image?: ImageInput
    location?: {lat?: number | null; lng?: number | null} | null
  },
  origin: string | null,
): JsonLdGraph | null {
  if (!origin || !property.name || !property.slug) return null
  const {lat, lng} = property.location ?? {}
  return withContext(
    compact({
      '@type': 'Place',
      '@id': placeId(property.slug, origin),
      name: property.name,
      url: absoluteUrl(`/properties/${property.slug}`, origin),
      description: property.description,
      image: property.image?.url,
      geo:
        typeof lat === 'number' && typeof lng === 'number'
          ? {'@type': 'GeoCoordinates', latitude: lat, longitude: lng}
          : undefined,
    }),
  )
}

const placeId = (slug: string, origin: string) => `${origin}/properties/${slug}#place`

export function projectLd(
  project: {
    name?: string | null
    slug?: string | null
    description?: string | null
    image?: ImageInput
    /** The property this project takes place on, when it references a published one. */
    propertySlug?: string | null
  },
  origin: string | null,
): JsonLdGraph | null {
  if (!origin || !project.name || !project.slug) return null
  return withContext(
    compact({
      '@type': 'WebPage',
      name: project.name,
      url: absoluteUrl(`/projects/${project.slug}`, origin),
      description: project.description,
      image: project.image?.url,
      about: project.propertySlug ? {'@id': placeId(project.propertySlug, origin)} : undefined,
      isPartOf: {'@id': `${origin}/#website`},
    }),
  )
}

export function webPageLd(
  page: {name?: string | null; description?: string | null; path: string},
  origin: string | null,
): JsonLdGraph | null {
  if (!origin || !page.name) return null
  return withContext(
    compact({
      '@type': 'WebPage',
      name: page.name,
      url: absoluteUrl(page.path, origin),
      description: page.description,
      isPartOf: {'@id': `${origin}/#website`},
    }),
  )
}

/** A crumb with no `path` is a grouping segment that has no page of its own, so it has no link. */
export function breadcrumbLd(crumbs: {name?: string | null; path: string | null}[], origin: string | null): JsonLdGraph | null {
  if (!origin) return null
  const named = crumbs.filter((crumb): crumb is {name: string; path: string | null} => Boolean(crumb.name))
  if (named.length < 2) return null
  return withContext({
    '@type': 'BreadcrumbList',
    itemListElement: named.map((crumb, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.path === null ? undefined : absoluteUrl(crumb.path, origin),
      }),
    ),
  })
}

export type RecordInput = {
  title?: string | null
  date?: string | null
  fileUrl?: string | null
  fileName?: string | null
  mimeType?: string | null
  size?: number | null
}

/**
 * The records archive as one collection page. A record has no page of its own, only a row with a
 * download, so each is a DigitalDocument inside the list. `date` is the document's own date (a
 * meeting date, say), so it is `dateCreated`, never `datePublished`. The name falls back the way the
 * row label does: title, then date, then file name.
 */
export function recordsArchiveLd(
  input: {name?: string | null; path: string; records: RecordInput[]},
  origin: string | null,
): JsonLdGraph | null {
  if (!origin) return null
  const items = input.records.flatMap((record) => {
    const name = record.title || record.date || record.fileName
    if (!record.fileUrl || !name) return []
    return [
      compact({
        '@type': 'DigitalDocument',
        name,
        contentUrl: record.fileUrl,
        encodingFormat: record.mimeType,
        contentSize: typeof record.size === 'number' ? `${record.size} B` : undefined,
        dateCreated: record.date,
      }),
    ]
  })
  if (items.length === 0) return null
  return withContext(
    compact({
      '@type': 'CollectionPage',
      name: input.name,
      url: absoluteUrl(input.path, origin),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({'@type': 'ListItem', position: index + 1, item})),
      },
    }),
  )
}
