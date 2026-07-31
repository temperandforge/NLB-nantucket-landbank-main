/**
 * Converts every project's `boundaryId` (single string) into `boundaryIds` (array), then removes
 * the old field. One-off migration for the boundaryId -> boundaryIds schema change - see
 * docs/superpowers/specs/2026-07-31-multiple-boundaries-per-property-design.md.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateBoundaryIdToBoundaryIds.ts --with-user-token
 *
 * Idempotent. Only touches a project that still has `boundaryId` set and no `boundaryIds` yet - a
 * project already migrated (or created fresh with boundaryIds) is left untouched on a re-run.
 *
 * Pass --dry to print the plan without writing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const BATCH_SIZE = 50

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const toMigrate = await client.fetch<{_id: string; boundaryId: string}[]>(
    `*[_type == "project" && defined(boundaryId) && !defined(boundaryIds)]{_id, boundaryId}`,
  )

  console.log(`${toMigrate.length} project(s) to migrate.`)

  if (DRY_RUN) {
    for (const doc of toMigrate.slice(0, 5)) {
      console.log(
        `  + would set boundaryIds: ["${doc.boundaryId}"] and unset boundaryId on ${doc._id}`,
      )
    }
    if (toMigrate.length > 5) console.log(`  ...and ${toMigrate.length - 5} more.`)
    console.log('\nDry run complete.')
    return
  }

  let migrated = 0
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()
    for (const doc of batch) {
      tx.patch(doc._id, (patch) => patch.set({boundaryIds: [doc.boundaryId]}).unset(['boundaryId']))
    }
    await tx.commit()
    migrated += batch.length
    console.log(`  + migrated ${migrated}/${toMigrate.length}`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
