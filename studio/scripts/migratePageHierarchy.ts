/**
 * Migrates pages from a hand-authored full path in `slug` to the derived-URL model:
 * a single-segment `slug` plus a `parent` reference. See docs/DECISIONS.md section 2.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migratePageHierarchy.ts --with-user-token
 *
 * For a page with slug "about-us/conservation" this:
 *   1. ensures a `pathOnly` page exists for each ancestor segment ("about-us"),
 *   2. rewrites the page to slug "conservation" with `parent` pointing at it.
 *
 * Idempotent. Pages whose slug has no slash are left alone, so re-running is a no-op once
 * migrated. Ancestors are matched on slug plus their own parent and reused. Only the `slug` and
 * `parent` fields are touched - no other page content is modified.
 *
 * Pass --dry to print the plan without writing anything.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

/** Path segments a page URL may have, counting its own slug. Keep in sync with page.ts. */
const MAX_DEPTH = 3

type PageRow = {_id: string; name: string | null; slug: string}

/** "public-records" -> "Public Records", for the auto-created ancestor's editor-facing name. */
function titleize(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Ancestors resolved during this run, keyed by "parentId/slug". Only needed so a dry run - which
 * writes nothing, so the lookup below keeps missing - reports each ancestor once instead of once
 * per child.
 */
const resolvedAncestors = new Map<string, string>()

/**
 * Find or create the path-only page for one ancestor segment, scoped to its own parent so
 * "history" under two different parents stays two different pages.
 */
async function ensureAncestor(slug: string, parentId: string | null): Promise<string> {
  const cacheKey = `${parentId ?? ''}/${slug}`
  const cached = resolvedAncestors.get(cacheKey)
  if (cached) return cached

  const existing = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == $slug && coalesce(parent._ref, "") == $parentId][0]._id`,
    {slug, parentId: parentId ?? ''},
  )
  if (existing) {
    console.log(`    = ancestor exists: ${slug} (${existing})`)
    resolvedAncestors.set(cacheKey, existing)
    return existing
  }

  if (DRY_RUN) {
    console.log(`    + would create ancestor: ${slug} (pathOnly)`)
    const placeholder = `dry-run-${slug}`
    resolvedAncestors.set(cacheKey, placeholder)
    return placeholder
  }

  const created = await client.create({
    _type: 'page',
    name: titleize(slug),
    slug: {_type: 'slug', current: slug},
    // The whole point of these documents: they contribute a URL segment but are not viewable.
    pathOnly: true,
    ...(parentId ? {parent: {_type: 'reference', _ref: parentId}} : {}),
  })
  console.log(`    + ancestor created: ${slug} (${created._id})`)
  resolvedAncestors.set(cacheKey, created._id)
  return created._id
}

// Pages whose slug still holds a multi-segment path.
//
// Filtered in JS rather than with a GROQ `match` glob on the slash: `match` is word-tokenized
// rather than a literal glob, so a slash pattern also matches slash-free slugs such as
// "connect-with-us" - which made the first version of this script report every page as needing
// migration, and its final verification never reach zero.
async function pagesNeedingMigration(): Promise<PageRow[]> {
  const all = await client.fetch<PageRow[]>(
    `*[_type == "page" && defined(slug.current)] | order(slug.current asc)
       {_id, name, "slug": slug.current}`,
  )
  return all.filter((page) => page.slug.includes('/'))
}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const pages = await pagesNeedingMigration()

  if (!pages.length) {
    console.log('No pages with a slash in their slug. Nothing to migrate.')
    return
  }

  console.log(`Found ${pages.length} page(s) to migrate.\n`)

  let migrated = 0
  for (const page of pages) {
    const segments = page.slug.split('/').filter(Boolean)
    const leaf = segments.pop()
    if (!leaf) {
      console.warn(`  ! skipping ${page._id}: slug "${page.slug}" has no final segment`)
      continue
    }

    if (segments.length + 1 > MAX_DEPTH) {
      console.warn(
        `  ! skipping ${page._id}: "${page.slug}" is ${segments.length + 1} segments deep, over the ${MAX_DEPTH} limit`,
      )
      continue
    }

    console.log(`  ${page.slug}  ->  ${leaf} (parent chain: ${segments.join(' / ') || 'none'})`)

    let parentId: string | null = null
    for (const segment of segments) {
      parentId = await ensureAncestor(segment, parentId)
    }

    if (DRY_RUN) {
      console.log(`    ~ would set slug="${leaf}", parent=${parentId}`)
      migrated++
      continue
    }

    await client
      .patch(page._id)
      .set({
        slug: {_type: 'slug', current: leaf},
        ...(parentId ? {parent: {_type: 'reference', _ref: parentId}} : {}),
      })
      .commit()
    console.log(`    ~ updated`)
    migrated++
  }

  console.log(`\n${DRY_RUN ? 'Would migrate' : 'Migrated'} ${migrated} page(s).`)

  if (!DRY_RUN) {
    const remaining = await pagesNeedingMigration()
    console.log(
      remaining.length === 0
        ? 'Verified: no page slug contains a slash.'
        : `WARNING: ${remaining.length} page slug(s) still contain a slash: ${remaining
            .map((p) => p.slug)
            .join(', ')}`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
