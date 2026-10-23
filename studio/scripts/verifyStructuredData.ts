/**
 * Runs the real structured-data builders and their real GROQ queries against the dataset.
 *
 *   npx sanity exec scripts/verifyStructuredData.ts --with-user-token
 *
 * The builders are pure and have their own fixture checks (`frontend/scripts/checkStructuredData.ts`).
 * What those cannot catch is a query that stops projecting a field a builder needs, or a document
 * shape the fixtures never imagined. So for one published document of each covered type this
 * fetches it with the frontend's own query, builds its JSON-LD, and checks that the graph exists,
 * names its type, and carries only absolute https URLs. It imports the builders and queries
 * rather than restating them, so it cannot drift from what the site runs.
 *
 * Read-only. Exits non-zero if any check fails. A type with no published document is skipped.
 */

import {getCliClient} from 'sanity/cli'

import {
  articleQuery,
  eventQuery,
  getPageQuery,
  projectQuery,
  propertyQuery,
  sitemapData,
  siteStructuredDataQuery,
} from '../../frontend/sanity/lib/queries'
import {
  type JsonLdGraph,
  breadcrumbLd,
  eventLd,
  newsArticleLd,
  organizationLd,
  placeLd,
  projectLd,
  recordsArchiveLd,
  webPageLd,
  websiteLd,
} from '../../frontend/sanity/lib/structuredData'
import {getSiteUrl} from '../../frontend/sanity/lib/siteUrl'

const client = getCliClient({apiVersion: '2025-09-25'})

// A stand-in origin: the check is about shape, so it does not depend on Settings being filled in.
const ORIGIN = getSiteUrl({siteUrl: 'https://verify.example.org'})

const failures: string[] = []

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failures.push(message)
  }
}

const URL_KEYS = new Set(['url', 'item', 'contentUrl', 'image', 'logo', 'mainEntityOfPage', '@id'])

/** Every value under a URL-ish key, anywhere in the graph. */
function urlsIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((entry) => urlsIn(entry, found))
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (URL_KEYS.has(key) && typeof entry === 'string') found.push(entry)
      else urlsIn(entry, found)
    }
  }
  return found
}

function verify(label: string, graph: JsonLdGraph | null, type: string) {
  check(graph !== null, `${label}: builds a graph`)
  if (!graph) return
  check(graph['@type'] === type, `${label}: is a ${type}`)
  const urls = urlsIn(graph)
  const bad = urls.filter((url) => !url.startsWith('https://'))
  check(bad.length === 0, `${label}: every URL is absolute https${bad.length ? ` (found ${bad.join(', ')})` : ''}`)
}

async function firstSlug(type: string): Promise<string | null> {
  return client.fetch<string | null>(`*[_type == $type && defined(slug.current) && !(_id in path("drafts.**"))][0].slug.current`, {
    type,
  })
}

async function main() {
  const site = await client.fetch(siteStructuredDataQuery)
  console.log('site')
  verify('organization', organizationLd({name: site?.title, organization: site?.organization, logoUrl: site?.organization?.logoUrl}, ORIGIN), 'Organization')
  verify('website', websiteLd({name: site?.title, description: site?.description}, ORIGIN), 'WebSite')

  // The landing page is reachable at / and at its own path; only / may be canonical and listed.
  const landingId = await client.fetch<string | null>(
    `*[_type == "settings" && _id == "siteSettings"][0].landingPage._ref`,
  )
  if (landingId) {
    console.log('landing page')
    const landing = await client.fetch<{slug: string | null}[]>(sitemapData)
    const landingSlug = await client.fetch<string | null>(`*[_id == $id][0].slug.current`, {id: landingId})
    check(!landing.some((entry) => entry.slug === landingSlug), 'the landing page is not listed in the sitemap at its own path')
  }

  const articleSlug = await firstSlug('article')
  if (articleSlug) {
    console.log('article')
    const article = await client.fetch(articleQuery, {slug: articleSlug})
    verify('article', newsArticleLd({title: article.title, slug: article.slug, date: article.date}, ORIGIN), 'NewsArticle')
  }

  const eventSlug = await firstSlug('event')
  if (eventSlug) {
    console.log('event')
    const event = await client.fetch(eventQuery, {slug: eventSlug})
    verify('event', eventLd(event, ORIGIN), 'Event')
  }

  const propertySlug = await firstSlug('property')
  if (propertySlug) {
    console.log('property')
    const property = await client.fetch(propertyQuery, {slug: propertySlug})
    verify('property', placeLd(property, ORIGIN), 'Place')
  }

  const projectSlug = await firstSlug('project')
  if (projectSlug) {
    console.log('project')
    const project = await client.fetch(projectQuery, {slug: projectSlug})
    verify('project', projectLd(project, ORIGIN), 'WebPage')
  }

  // A nested page proves the ancestors projection; a page with a records block proves the file fields.
  const pagePaths = await client.fetch<{path: string}[]>(
    `*[_type == "page" && defined(parent) && !coalesce(pathOnly, false) && !(_id in path("drafts.**"))]{
       "path": select(
         defined(parent->parent) => parent->parent->slug.current + "/" + parent->slug.current + "/" + slug.current,
         parent->slug.current + "/" + slug.current)
     }`,
  )
  const nested = pagePaths[0]?.path
  if (nested) {
    console.log(`nested page /${nested}`)
    const segments = nested.split('/')
    const page = await client.fetch(getPageQuery, {
      leaf: segments[segments.length - 1],
      path: nested,
      includeHidden: false,
      now: new Date().toISOString(),
    })
    check(Boolean(page), 'nested page resolves')
    const ancestors = (page?.ancestors ?? []).filter(Boolean)
    check(ancestors.length === segments.length - 1, `ancestors cover the parent chain (${ancestors.length} of ${segments.length - 1})`)
    const crumbs = [
      {name: site?.title, path: '/'},
      ...ancestors.map((a: {name?: string; pathOnly?: boolean; path?: string}) => ({name: a.name, path: a.pathOnly ? null : `/${a.path}`})),
      {name: page?.name, path: `/${nested}`},
    ]
    verify('breadcrumb', breadcrumbLd(crumbs, ORIGIN), 'BreadcrumbList')
    verify('webpage', webPageLd({name: page?.name, path: `/${nested}`}, ORIGIN), 'WebPage')
  }

  const recordsPage = await client.fetch<{path: string} | null>(
    `*[_type == "page" && count(pageBuilder[_type == "recordsArchive"]) > 0 && !(_id in path("drafts.**"))][0]{
       "path": select(
         defined(parent->parent) => parent->parent->slug.current + "/" + parent->slug.current + "/" + slug.current,
         defined(parent) => parent->slug.current + "/" + slug.current,
         slug.current)
     }`,
  )
  if (recordsPage?.path) {
    console.log(`records page /${recordsPage.path}`)
    const segments = recordsPage.path.split('/')
    const page = await client.fetch(getPageQuery, {
      leaf: segments[segments.length - 1],
      path: recordsPage.path,
      includeHidden: false,
      now: new Date().toISOString(),
    })
    const archive = page?.pageBuilder?.find((block: {_type: string}) => block._type === 'recordsArchive')
    check(Boolean(archive), 'records page has a records archive block')
    const graph = recordsArchiveLd({name: page?.name, path: `/${recordsPage.path}`, records: archive?.records ?? []}, ORIGIN)
    verify('records archive', graph, 'CollectionPage')
    const first = (graph?.mainEntity as {itemListElement?: {item: Record<string, unknown>}[]} | undefined)?.itemListElement?.[0]?.item
    check(Boolean(first?.encodingFormat), 'a record carries its mime type from the query')
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll structured-data checks passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
