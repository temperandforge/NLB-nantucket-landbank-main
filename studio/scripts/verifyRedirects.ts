/**
 * Verifies the redirect documents against the real dataset.
 *
 *   npx sanity exec scripts/verifyRedirects.ts --with-user-token
 *
 * The schema validators check one redirect at a time, in Studio; they cannot see data that was
 * imported, edited in another dataset, or made stale by a page being renamed since. This checks
 * the whole set: no enabled redirect shadows a live page, every enabled non-410 redirect leads
 * somewhere, and no two redirects share a source. Source comparison goes through
 * normaliseSource and paths through buildPagePath, the same modules the rest of the feature uses.
 *
 * Published documents only. Read-only. Exits non-zero on any failure.
 */

import {getCliClient} from 'sanity/cli'

import {buildPagePath, PAGE_LOCATION_SELECT, previewPathToGroq} from '../src/lib/pageHierarchy'
import {normaliseSource} from '../src/lib/redirectSource'

const client = getCliClient({apiVersion: '2025-09-25'})

type PageRow = {
  _id: string
  slug: string | null
  pathOnly: boolean
  parentSlug: string | null
  grandparentSlug: string | null
}

type RedirectRow = {
  _id: string
  source: string | null
  enabled: boolean
  statusCode: number
  destination: {linkType?: string; href?: string; page?: {_ref?: string}} | null
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

const pagePath = (page: PageRow) =>
  `/${buildPagePath([page.grandparentSlug, page.parentSlug, page.slug])}`

async function main() {
  const select = Object.entries(PAGE_LOCATION_SELECT)
    .map(([alias, path]) => `"${alias}": ${previewPathToGroq(path)}`)
    .join(', ')

  const pages = await client.fetch<PageRow[]>(
    `*[_type == "page" && !(_id in path("drafts.**")) && defined(slug.current)]{
       _id,
       "pathOnly": coalesce(pathOnly, false),
       ${select}
     }`,
  )
  const redirects = await client.fetch<RedirectRow[]>(
    `*[_type == "redirect" && !(_id in path("drafts.**"))]{
       _id,
       source,
       "enabled": coalesce(enabled, true),
       "statusCode": coalesce(statusCode, 301),
       destination
     }`,
  )
  console.log(`Loaded ${pages.length} page(s) and ${redirects.length} redirect(s).\n`)

  const pageById = new Map(pages.map((p) => [p._id, p]))
  const livePaths = new Map(pages.filter((p) => !p.pathOnly).map((p) => [pagePath(p), p._id]))
  const enabled = redirects.filter((r) => r.enabled && r.source)

  console.log('No enabled redirect shadows a live page:')
  for (const r of enabled) {
    const path = normaliseSource(r.source as string).split('?')[0]
    const page = livePaths.get(path)
    check(!page, `${r.source} (${r._id})${page ? ` is the live path of page ${page}` : ''}`)
  }
  if (enabled.length === 0) console.log('  (no enabled redirects)')

  console.log('\nEvery enabled redirect leads somewhere:')
  for (const r of enabled) {
    if (r.statusCode === 410) {
      check(true, `${r.source} is 410 Gone`)
      continue
    }
    const d = r.destination
    if (d?.linkType === 'page') {
      const target = d.page?._ref ? pageById.get(d.page._ref) : undefined
      check(
        !!target && !target.pathOnly,
        `${r.source} -> ${
          !target
            ? 'page is missing or unpublished'
            : target.pathOnly
              ? 'page is path-only'
              : pagePath(target)
        }`,
      )
    } else {
      check(!!d?.href?.trim(), `${r.source} -> ${d?.href?.trim() || 'empty destination'}`)
    }
  }
  if (enabled.length === 0) console.log('  (no enabled redirects)')

  console.log('\nNo two redirects share a source:')
  const bySource = new Map<string, string[]>()
  for (const r of redirects.filter((x) => x.source)) {
    const key = normaliseSource(r.source as string)
    bySource.set(key, [...(bySource.get(key) ?? []), r._id])
  }
  for (const [source, ids] of bySource) {
    if (ids.length > 1) check(false, `${source} is used by ${ids.join(', ')}`)
  }
  check(
    [...bySource.values()].every((ids) => ids.length === 1),
    `${bySource.size} distinct source(s) across ${redirects.length} redirect(s)`,
  )

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`)
    process.exit(1)
  }
  console.log('\nAll checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
