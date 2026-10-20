/**
 * Creates one DRAFT `property` per distinct `Name` in the uploaded boundary file, each named
 * "<Name> - Needs Review" with `boundaryIds` set to every feature sharing that name. Follows the
 * properties already made by hand in Studio (same name pattern, slug rule and fields).
 *
 * Run from the studio directory, dry first, and read the plan before the real run:
 *   npx sanity exec scripts/generatePropertiesFromBoundaries.ts --with-user-token -- --dry
 *   npx sanity exec scripts/generatePropertiesFromBoundaries.ts --with-user-token
 *
 * What it writes: new draft documents only (`drafts.<generated id>`). Nothing goes live until an
 * editor publishes them in Studio. It never edits or deletes anything, so no authored content is
 * overwritten.
 *
 * Idempotent: a name that already has a property (matched by slug, or by name without the
 * " - Needs Review" suffix, in either the published or draft copy) is skipped, so re-running after
 * creating or renaming some by hand only fills the gaps.
 *
 * It reports, and does NOT create:
 *  - names with a boundary already assigned to another property (a boundary assigned twice draws
 *    two overlapping polygons) - resolve those by hand;
 *  - features with no name in the file, which cannot become a property;
 *  - names whose slug clashes with another.
 *
 * The planning rules live in src/lib/propertyGeneration.ts and are checked by
 * scripts/verifyPropertyGeneration.ts.
 */

import {getCliClient} from 'sanity/cli'

import {planPropertyGeneration, type BoundaryFeature} from '../src/lib/propertyGeneration'

// Raw perspective, so drafts count as existing and their boundaries as taken.
const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const BATCH_SIZE = 50

async function main() {
  const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{
      "url": boundaryData.asset->url,
      "idProperty": coalesce(boundaryIdProperty, "FID")
    }`,
  )
  if (!settings?.url) throw new Error('No boundary file uploaded on Properties Settings.')
  const idProperty = settings.idProperty || 'FID'

  const response = await fetch(settings.url)
  if (!response.ok) throw new Error(`Could not download the boundary file (${response.status}).`)
  const geojson = await response.json()
  const features: BoundaryFeature[] = Array.isArray(geojson?.features) ? geojson.features : []

  const existing = await client.fetch<
    Array<{name?: string; slug?: string; boundaryIds?: string[]}>
  >(`*[_type == "property"]{name, "slug": slug.current, boundaryIds}`)

  const plan = planPropertyGeneration(features, existing, idProperty)

  console.log(
    `${features.length} boundary feature(s) in the file, ${existing.length} existing property document(s) (drafts and published).`,
  )
  console.log(`Plan (ID property "${idProperty}"):`)
  console.log(`  to create:        ${plan.create.length}`)
  console.log(`  already exist:    ${plan.skippedExisting.length}`)
  console.log(`  boundary taken:   ${plan.conflicts.length}`)
  console.log(`  slug clashes:     ${plan.slugClashes.length}`)
  console.log(`  unnamed features: ${plan.unnamed.length}`)

  plan.conflicts.forEach((conflict) =>
    console.error(
      `  ! not created: "${conflict.name}" - ${conflict.taken
        .map((t) => `${t.id} is on "${t.owner}"`)
        .join(', ')}`,
    ),
  )
  plan.slugClashes.forEach((name) => console.error(`  ! not created: "${name}" - its slug is already used`))
  if (plan.unnamed.length > 0) {
    console.error('  ! unnamed features (no Name in the file), not created:')
    plan.unnamed.forEach((u) => console.error(`      ${idProperty} ${u.id}  ${u.acres} acres  owner ${u.owner}`))
  }

  if (DRY_RUN) {
    plan.create.forEach((p) =>
      console.log(`  [dry run] would create draft "${p.name}" (${p.slug}) with ${p.boundaryIds.length} boundary id(s)`),
    )
    console.log(`[dry run] ${plan.create.length} draft(s) would be created; nothing written.`)
    return
  }

  if (plan.create.length === 0) {
    console.log('Nothing to create.')
    return
  }

  let created = 0
  for (let i = 0; i < plan.create.length; i += BATCH_SIZE) {
    const tx = client.transaction()
    for (const p of plan.create.slice(i, i + BATCH_SIZE)) {
      // `drafts.` with no id after it lets Sanity generate the id, as for any non-singleton.
      tx.create({
        _id: 'drafts.',
        _type: 'property',
        name: p.name,
        slug: {_type: 'slug', current: p.slug},
        boundaryIds: p.boundaryIds,
        disablePopup: false,
      })
    }
    const result = await tx.commit()
    created += result.results.length
    console.log(`  created ${created} of ${plan.create.length}`)
  }
  console.log(`Created ${created} draft property document(s). Publish them in Studio when ready.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
