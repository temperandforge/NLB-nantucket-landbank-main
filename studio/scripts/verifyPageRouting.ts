/**
 * Verifies the page-hierarchy routing contract against the real dataset.
 *
 *   npx sanity exec scripts/verifyPageRouting.ts --with-user-token
 *
 * The repo has no test infrastructure, and Presentation's URL -> document resolution is easy to
 * break silently: a route filter can stop matching, or two routes can start matching the same
 * document, without anything failing to compile. This exercises the actual filters from
 * src/lib/pageHierarchy.ts - the same ones sanity.config.ts uses - so the two cannot drift.
 *
 * Read-only. Exits non-zero on the first failure.
 */

import {getCliClient} from 'sanity/cli'

import {
  buildPagePath,
  MAX_PAGE_DEPTH,
  PAGE_LOCATION_SELECT,
  PAGE_PRESENTATION_ROUTES,
} from '../src/lib/pageHierarchy'

const client = getCliClient({apiVersion: '2025-09-25'})

type PageRow = {
  _id: string
  slug: string
  pathOnly: boolean
  parentSlug: string | null
  grandparentSlug: string | null
}

const failures: string[] = []

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failures.push(message)
  }
}

async function main() {
  // Exercises the same dereferencing projection the location resolver uses, so if `parent->` in
  // a defineLocations select were invalid GROQ, this would surface it.
  const select = Object.entries(PAGE_LOCATION_SELECT)
    .map(([alias, path]) => `"${alias}": ${path}`)
    .join(', ')

  const pages = await client.fetch<PageRow[]>(
    `*[_type == "page" && defined(slug.current)] | order(slug.current asc){
       _id,
       "pathOnly": coalesce(pathOnly, false),
       ${select}
     }`,
  )

  console.log(`Loaded ${pages.length} page(s).\n`)

  console.log('Location projection resolves the parent chain:')
  const nested = pages.filter((p) => p.parentSlug)
  check(nested.length > 0, `${nested.length} page(s) resolved a parentSlug via "parent->slug.current"`)

  /**
   * Presentation picks the route whose parameter count matches the URL's segment count, so only
   * the same-arity route is a candidate for a given path. Every param the filters can reference is
   * always bound - GROQ rejects a query that mentions an unprovided param, even in a branch that
   * could not match.
   */
  const routeByArity = new Map(
    PAGE_PRESENTATION_ROUTES.map((r) => [(r.route.match(/:/g) ?? []).length, r]),
  )

  function paramsFor(segments: (string | null)[]): Record<string, string | null> {
    return {
      s1: segments[0] ?? null,
      s2: segments[1] ?? null,
      s3: segments[2] ?? null,
    }
  }

  function pathSegments(page: PageRow): string[] {
    return [page.grandparentSlug, page.parentSlug, page.slug].filter(Boolean) as string[]
  }

  console.log('\nEach routable page is matched by its own route, and by the right document:')
  for (const page of pages.filter((p) => !p.pathOnly)) {
    const segments = pathSegments(page)
    const path = buildPagePath(segments)

    if (segments.length > MAX_PAGE_DEPTH) {
      check(false, `/${path} exceeds MAX_PAGE_DEPTH (${MAX_PAGE_DEPTH})`)
      continue
    }

    const route = routeByArity.get(segments.length)
    if (!route) {
      check(false, `/${path} has ${segments.length} segment(s) but no route of that arity exists`)
      continue
    }

    const ids = await client.fetch<string[]>(`*[${route.filter}]._id`, paramsFor(segments))
    const unique = [...new Set(ids)]
    check(
      unique.length === 1 && unique[0] === page._id,
      `/${path} via ${route.route} -> ${
        unique.length === 1
          ? unique[0] === page._id
            ? 'correct document'
            : `WRONG document ${unique[0]}`
          : `${unique.length} matches`
      }`,
    )
  }

  /**
   * The reason each route is anchored with !defined(...) at the top of the chain: without it,
   * "/conservation" would also match the page that really lives at "/about-us/conservation",
   * so a shallow URL would resolve to a deeper document.
   */
  console.log('\nA nested page is NOT reachable by its leaf slug alone:')
  const shallowRoute = routeByArity.get(1)!
  for (const page of pages.filter((p) => !p.pathOnly && p.parentSlug)) {
    const count = await client.fetch<number>(
      `count(*[${shallowRoute.filter}])`,
      paramsFor([page.slug]),
    )
    check(count === 0, `/${page.slug} matches ${count} document(s) (expected 0)`)
  }

  console.log('\nPath-only pages are matched by no route:')
  for (const page of pages.filter((p) => p.pathOnly)) {
    const segments = pathSegments(page)
    const path = buildPagePath(segments)
    const route = routeByArity.get(segments.length)
    const count = route
      ? await client.fetch<number>(`count(*[${route.filter}])`, paramsFor(segments))
      : 0
    check(count === 0, `/${path} matches ${count} route document(s) (expected 0)`)
  }

  console.log('\nNo slug contains a slash, and slugs are unique per parent:')
  const withSlash = pages.filter((p) => p.slug.includes('/'))
  check(withSlash.length === 0, `${withSlash.length} slug(s) contain a slash`)

  const seen = new Map<string, string>()
  let collisions = 0
  for (const page of pages) {
    const key = `${page.parentSlug ?? ''}/${page.slug}`
    const existing = seen.get(key)
    if (existing) {
      collisions++
      console.error(`  FAIL duplicate slug "${page.slug}" under the same parent (${existing}, ${page._id})`)
    } else {
      seen.set(key, page._id)
    }
  }
  check(collisions === 0, `${collisions} sibling slug collision(s)`)

  console.log(
    failures.length === 0
      ? '\nAll routing checks passed.'
      : `\n${failures.length} check(s) FAILED.`,
  )
  if (failures.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
