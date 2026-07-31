/**
 * Assigns a random propertyType (exactly 1) and random resources (1-2) to every project that
 * doesn't have propertyTypes set yet - placeholder categorisation for the client to correct once
 * real data is known.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/assignRandomTaxonomy.ts --with-user-token
 *
 * Never creates or modifies propertyType/resource documents - only reads existing ones.
 *
 * Idempotent. Only touches a project with no propertyTypes set yet - a project already
 * categorised (by this script or by hand) is left untouched on a re-run.
 *
 * Pass --dry to print the plan without writing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'})

const DRY_RUN = process.argv.includes('--dry')

const BATCH_SIZE = 50

function reference(id: string, key: string) {
  return {_type: 'reference' as const, _ref: id, _key: key}
}

/** Picks `count` distinct random elements from `items`, order not preserved. */
function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

async function main() {
  if (DRY_RUN) console.log('DRY RUN - nothing will be written.\n')

  const propertyTypeIds: string[] = await client.fetch(`*[_type == "propertyType"]._id`)
  const resourceIds: string[] = await client.fetch(`*[_type == "resource"]._id`)
  if (propertyTypeIds.length === 0) {
    console.error('No propertyType documents exist.')
    process.exit(1)
  }
  console.log(`Found ${propertyTypeIds.length} propertyType(s) and ${resourceIds.length} resource(s) to choose from.\n`)

  const toAssign: {_id: string; name: string | null}[] = await client.fetch(
    `*[_type == "project" && !defined(propertyTypes)]{_id, name}`,
  )

  console.log(`${toAssign.length} project(s) to assign a propertyType/resources to.`)

  if (DRY_RUN) {
    for (const doc of toAssign.slice(0, 5)) {
      const resourceCount = Math.floor(Math.random() * 2) + 1 // 1 or 2
      console.log(`  + ${doc.name ?? doc._id} (1 propertyType, ${resourceCount} resource(s))`)
    }
    if (toAssign.length > 5) console.log(`  ...and ${toAssign.length - 5} more.`)
    console.log('\nDry run complete.')
    return
  }

  let updated = 0
  for (let i = 0; i < toAssign.length; i += BATCH_SIZE) {
    const batch = toAssign.slice(i, i + BATCH_SIZE)
    const tx = client.transaction()
    for (const doc of batch) {
      const propertyType = pickRandom(propertyTypeIds, 1)[0]
      const resources = pickRandom(resourceIds, Math.floor(Math.random() * 2) + 1) // 1-2

      tx.patch(doc._id, (patch) =>
        patch.set({
          propertyTypes: [reference(propertyType, 'pt-0')],
          resources: resources.map((resourceId, index) => reference(resourceId, `r-${index}`)),
        }),
      )
    }
    await tx.commit()
    updated += batch.length
    console.log(`  + assigned ${updated}/${toAssign.length}`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
