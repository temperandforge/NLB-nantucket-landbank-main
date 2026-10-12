/**
 * Deletes every `project` document that is NOT one of the Land Bank's projects seeded by
 * seedLandBankProjects.ts - i.e. the old map "projects" left in place after
 * migrateProjectsToProperties.ts copied them into `property`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/removeLegacyProjects.ts --with-user-token -- --dry
 *   npx sanity exec scripts/removeLegacyProjects.ts --with-user-token
 *
 * What it deletes: published documents and drafts of type `project` whose slug is not in KEEP.
 * PERMANENT. Before deleting it writes every document it will remove to
 * scripts/data/migrations/removed-projects-<timestamp>.json (git-ignored) so they can be restored.
 *
 * It REFUSES to run if (a) any other document references a project it would delete, or (b) a
 * project it would delete has no `property` with the same slug (its data would be lost, not just
 * duplicated - the migration should have copied it).
 *
 * --dry prints the plan and writes and deletes nothing.
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

// Slugs of the projects from seedLandBankProjects.ts. Kept in step with that script by hand.
const KEEP = new Set([
  'lily-pond-park-project',
  'mill-hill-park-revitalization-project',
  '41-jefferson-avenue-beach-project',
  '41-jefferson-houses-reuse-project',
  'maintenance-facility-project',
  'forest-management-project',
  'community-garden',
  'land-bank-rain-garden',
  'washington-street-resilience-framework-plan',
  'cisco-beach-parking-lot-relocation',
  'bike-park-project',
])

type Doc = {_id: string; name?: string; slug?: {current?: string}}

async function main() {
  const projects = await client.fetch<Doc[]>(`*[_type == "project"]`)
  const doomed = projects.filter((doc) => !KEEP.has(doc.slug?.current ?? ''))
  const kept = projects.length - doomed.length
  console.log(`${projects.length} project document(s): keeping ${kept}, removing ${doomed.length}.`)

  const ids = doomed.map((doc) => doc._id)
  const referrers = await client.fetch<Array<{_id: string; _type: string}>>(
    `*[!(_id in $ids) && references($ids)]{_id, _type}`,
    {ids},
  )
  const propertySlugs = new Set(
    (await client.fetch<Array<string | null>>(`*[_type == "property"].slug.current`)).flatMap((s) => (s ? [s] : [])),
  )
  const uncovered = doomed.filter((doc) => !propertySlugs.has(doc.slug?.current ?? ''))

  referrers.forEach((doc) => console.error(`  ! referenced by ${doc._type} ${doc._id}`))
  uncovered.forEach((doc) => console.error(`  ! no property with slug "${doc.slug?.current}" (${doc._id}, ${doc.name})`))
  if (referrers.length > 0 || uncovered.length > 0) {
    console.error('Refusing to delete: see the lines marked ! above.')
    process.exit(1)
  }

  if (DRY_RUN) {
    doomed.forEach((doc) => console.log(`  [dry run] would delete ${doc._id} (${doc.name})`))
    return
  }

  const dir = resolve(__dirname, 'data/migrations')
  mkdirSync(dir, {recursive: true})
  const backup = resolve(dir, `removed-projects-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(backup, JSON.stringify(doomed, null, 2))
  console.log(`Backed up to ${backup}`)

  for (let i = 0; i < ids.length; i += 100) {
    const tx = client.transaction()
    ids.slice(i, i + 100).forEach((id) => tx.delete(id))
    await tx.commit()
  }
  console.log(`Deleted ${ids.length} document(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
