/**
 * Checks the Studio warnings for page edits (`src/lib/pageUrlImpact.ts`) against an in-memory
 * dataset. No dataset access:
 *
 *   cd studio && npx sanity exec scripts/verifyPageUrlImpact.ts
 *
 * Imports the real module. Exits non-zero on failure.
 */
import {describeRemovalImpact, describeRenameImpact, type FetchClient} from '../src/lib/pageUrlImpact'

type Page = {_id: string; slug: string; parentId?: string; pathOnly?: boolean}
type Redirect = {_id: string; source: string; enabled?: boolean; pageId?: string}

function stub(pages: Page[], redirects: Redirect[]): FetchClient {
  return {
    async fetch(query: string, params: Record<string, unknown> = {}) {
      if (query.includes('_type == "redirect" && coalesce(enabled, true) == true')) {
        return redirects.filter((r) => r.enabled !== false).map((r) => ({id: r._id, source: r.source})) as never
      }
      if (query.includes('destination.page._ref == $id')) {
        return redirects
          .filter((r) => r.pageId === params.id)
          .map((r) => ({source: r.source, enabled: r.enabled !== false})) as never
      }
      if (query.includes('parent._ref in $parentIds')) {
        const ids = params.parentIds as string[]
        return pages
          .filter((p) => p.parentId && ids.includes(p.parentId))
          .map((p) => ({_id: p._id, slug: p.slug, pathOnly: Boolean(p.pathOnly), parentId: p.parentId})) as never
      }
      const page = pages.find((p) => p._id === params.id)
      if (!page) return null as never
      return {slug: page.slug, parentId: page.parentId ?? null, pathOnly: Boolean(page.pathOnly)} as never
    },
  }
}

let failed = false
function check(condition: boolean, message: string) {
  if (condition) console.log(`  ok   ${message}`)
  else {
    failed = true
    console.error(`  FAIL ${message}`)
  }
}

const pages: Page[] = [
  {_id: 'about', slug: 'about'},
  {_id: 'history', slug: 'history', parentId: 'about'},
  {_id: 'early', slug: 'early', parentId: 'history'},
  {_id: 'news', slug: 'news-page'},
]

async function main() {
// rename
  {
    const client = stub(pages, [])
    const msg = await describeRenameImpact(client, {_id: 'drafts.about', slug: {current: 'about-us'}})
    check(!!msg && msg.includes('/about → /about-us'), 'a rename lists the page')
    check(!!msg && msg.includes('/about/history → /about-us/history') && msg.includes('/about/history/early'), 'and every descendant')
    check(!!msg && msg.includes('created automatically'), 'and says redirects are created')
    check(
      (await describeRenameImpact(client, {_id: 'drafts.about', slug: {current: 'about'}})) === null,
      'an unchanged slug has no warning',
    )
    check(
      (await describeRenameImpact(client, {_id: 'drafts.brand-new', slug: {current: 'x'}})) === null,
      'a never-published page has no warning',
    )
    const moved = await describeRenameImpact(client, {
      _id: 'drafts.news',
      slug: {current: 'news-page'},
      parent: {_ref: 'drafts.about'},
    })
    check(!!moved && moved.includes('/news-page → /about/news-page'), 'moving under a parent lists the new path (draft parent ref)')
    const covered = await describeRenameImpact(stub(pages, [{_id: 'r1', source: '/about'}]), {
      _id: 'about',
      slug: {current: 'about-us'},
    })
    check(!!covered && covered.includes('1 already has one'), 'an existing redirect is reported as already there')
    const asPathOnly = await describeRenameImpact(client, {_id: 'about', slug: {current: 'about'}, pathOnly: true})
    check(!!asPathOnly && asPathOnly.includes('return 404'), 'turning a page into a path segment warns it will 404')
  }
  
  // removal
  {
    const client = stub(pages, [{_id: 'r1', source: '/old-about', pageId: 'about'}, {_id: 'r2', source: '/off', pageId: 'about', enabled: false}])
    const msg = await describeRemovalImpact(client, 'drafts.about')
    check(!!msg && msg.includes('/about will return 404'), 'removal names the page URL')
    check(!!msg && msg.includes('/about/history') && msg.includes('/about/history/early'), 'and the pages below it')
    check(!!msg && msg.includes('/old-about') && !msg.includes('/off'), 'and enabled redirects pointing at it, not disabled ones')
    check((await describeRemovalImpact(client, 'drafts.unpublished-draft')) === null, 'a never-published page has nothing to lose')
    const leaf = await describeRemovalImpact(client, 'news')
    check(!!leaf && leaf.includes('/news-page will return 404') && !leaf.includes('below'), 'a leaf with no redirects only names its own URL')
  }

  if (failed) {
    console.error('\nverifyPageUrlImpact: FAILED')
    process.exit(1)
  }
  console.log('\nverifyPageUrlImpact: all checks passed')
}

main()
