/**
 * Replaces every existing `project` document with one per real property listed at
 * https://www.nantucketlandbank.org/property-sitemap.xml (42 properties, captured below as of
 * 2026-07-31 - re-fetch and update PROPERTY_SLUGS if the client adds or removes properties).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/replaceProjectsWithSitemap.ts --with-user-token
 *
 * Deletes every project whose slug is NOT one of the 42 sitemap slugs (this removes both the
 * original hand-picked seed data and the auto-generated track_N boundary placeholders).
 *
 * Creates, for every sitemap slug not already a project (matched on slug):
 *   - name: derived from the slug via simple title-casing (e.g. "madaquecham-beach" ->
 *     "Madaquecham Beach") - not pulled from the live site, so review/correct in Studio.
 *   - slug: the sitemap slug, unchanged.
 *   - Everything else (description, image, propertyTypes, resources, boundaryIds) is left empty
 *     for the client to fill in.
 *
 * Idempotent by design, not just on first run: a project matching a sitemap slug is left
 * completely untouched on re-run, and only a genuinely stale (non-sitemap) project is deleted.
 * Running this twice in a row is a no-op the second time.
 *
 * Pass --dry to print the plan (what would be deleted/created) without writing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const BATCH_SIZE = 50

/** Every property URL currently in https://www.nantucketlandbank.org/property-sitemap.xml. */
const PROPERTY_SLUGS = [
  'madaquecham-beach',
  'settlers-landing',
  'ladies-beach',
  '40th-pole',
  'surfside-beaches-western-ave-stones-and-footsteps',
  'west-end-overlook',
  'south-shore-loop',
  'peter-folger-homestead',
  'cato-commons',
  'miacomet-woods',
  'trotts-hills',
  'holly-farm',
  'cisco-beach',
  'gardner-farm',
  'beechwood-farm',
  'maxcy-pond',
  'sanford-farm-west-head-of-the-plains',
  'millbrook-woods-heritage-orchard',
  'sheep-commons',
  'sanford-meadows',
  'shawkemo-hills',
  'water-tower-beach',
  'lily-pond-park',
  'old-sconset-golf-course',
  'miacomet-golf-course',
  'the-creeks-preserve',
  'hinsdale-park',
  'miacomet-pond',
  'sesachacha-pond',
  'codfish-park',
  'the-coast-to-coast-trail',
  'land-bank-dog-park',
  'codfish-park-playground',
  'fair-street-park',
  'garden-of-the-sea',
  'reyes-pond',
  'burchell-farm',
  'smooth-hummocks-coastal-preserve',
  'stump-pond',
  'easy-street-park',
  'easton-st-rain-garden',
  'long-pond-landing',
]

/** "of", "the", etc. stay lowercase mid-title; the first word is always capitalized. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to',
])

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((word, index) => {
      if (index !== 0 && MINOR_WORDS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const sitemapSlugs = new Set(PROPERTY_SLUGS)

  const existing = await client.fetch<{_id: string; slug: string | null; name: string | null}[]>(
    `*[_type == "project"]{_id, "slug": slug.current, name}`,
  )

  const toDelete = existing.filter((doc) => !doc.slug || !sitemapSlugs.has(doc.slug))
  const existingSlugs = new Set(existing.map((doc) => doc.slug).filter(Boolean) as string[])
  const toCreate = PROPERTY_SLUGS.filter((slug) => !existingSlugs.has(slug))

  console.log(`${existing.length} project(s) currently exist.`)
  console.log(`${toDelete.length} project(s) to delete (not in the sitemap's 42 slugs).`)
  console.log(`${toCreate.length} project(s) to create (sitemap slugs not yet a project).`)
  console.log(
    `${existing.length - toDelete.length} project(s) already match a sitemap slug, left untouched.\n`,
  )

  if (DRY_RUN) {
    console.log('Sample of what would be deleted:')
    for (const doc of toDelete.slice(0, 5)) {
      console.log(`  - ${doc.name ?? 'Untitled'} (slug: ${doc.slug ?? 'none'})`)
    }
    if (toDelete.length > 5) console.log(`  ...and ${toDelete.length - 5} more.`)

    console.log('\nSample of what would be created:')
    for (const slug of toCreate.slice(0, 5)) {
      console.log(`  + ${titleCase(slug)} (slug: ${slug})`)
    }
    if (toCreate.length > 5) console.log(`  ...and ${toCreate.length - 5} more.`)

    console.log('\nDry run complete.')
    return
  }

  let deleted = 0
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()
    for (const doc of batch) tx.delete(doc._id)
    await tx.commit()
    deleted += batch.length
    console.log(`  - deleted ${deleted}/${toDelete.length}`)
  }

  let created = 0
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()
    for (const slug of batch) {
      tx.create({
        _type: 'project',
        name: titleCase(slug),
        slug: {_type: 'slug', current: slug},
      })
    }
    await tx.commit()
    created += batch.length
    console.log(`  + created ${created}/${toCreate.length}`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
