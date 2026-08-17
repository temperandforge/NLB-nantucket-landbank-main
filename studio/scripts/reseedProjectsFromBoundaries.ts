/**
 * Deletes every existing `project` document and recreates one project per distinct `Name` in the
 * uploaded boundary file, with `boundaryIds` set to every FID sharing that name.
 *
 * This is a one-off destructive reset, not a keyed upsert like the other scripts in this
 * directory - re-running it is safe (it deletes-then-recreates again) but it discards whatever
 * was authored on the existing projects (description, image, link, propertyTypes, resources).
 * That loss was an explicit, confirmed decision for this migration - see
 * docs/superpowers/specs/2026-08-17-multi-parcel-boundaries-design.md.
 *
 * Run with --dry first and read the plan before the real run.
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const isDry = process.argv.includes('--dry')

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const settings = await client.fetch<{url?: string; idProperty?: string} | null>(
    `*[_type == "projectSettings" && _id == "projectSettings"][0]{
      "url": boundaryData.asset->url,
      "idProperty": boundaryIdProperty
    }`,
  )
  if (!settings?.url) throw new Error('No boundary file uploaded on Project Settings.')
  if (settings.idProperty !== 'FID') {
    throw new Error(
      `This script assumes boundaryIdProperty is "FID", got "${settings.idProperty}". Update the script's grouping key if the file has changed.`,
    )
  }

  const res = await fetch(settings.url)
  const geojson = await res.json()

  const groups = new Map<string, string[]>()
  const skipped: number[] = []
  for (const feature of geojson.features as {properties: Record<string, unknown>}[]) {
    const name = feature.properties?.Name
    const fid = feature.properties?.FID
    if (typeof name !== 'string' || !name.trim() || fid === undefined || fid === null) {
      skipped.push(Number(fid))
      continue
    }
    const fids = groups.get(name) ?? []
    fids.push(String(fid))
    groups.set(name, fids)
  }

  const usedSlugs = new Set<string>()
  const plan: {name: string; slug: string; boundaryIds: string[]}[] = []
  for (const [name, boundaryIds] of groups) {
    let slug = slugify(name)
    let suffix = 2
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${suffix}`
      suffix++
    }
    usedSlugs.add(slug)
    plan.push({name, slug, boundaryIds})
  }
  plan.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`Planned projects: ${plan.length}`)
  for (const p of plan) {
    console.log(`  ${p.name} (${p.slug}) — ${p.boundaryIds.length} parcel(s)`)
  }
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length} feature(s) with no Name: FIDs ${skipped.join(', ')}`)
  }

  const existing = await client.fetch<string[]>(`*[_type == "project"]._id`)
  console.log(`\nExisting projects to delete: ${existing.length}`)

  if (isDry) {
    console.log('\nDry run - no documents were changed.')
    return
  }

  const deleteTx = client.transaction()
  for (const id of existing) deleteTx.delete(id)
  await deleteTx.commit()

  const createTx = client.transaction()
  for (const p of plan) {
    createTx.create({
      _type: 'project',
      name: p.name,
      slug: {_type: 'slug', current: p.slug},
      boundaryIds: p.boundaryIds,
    })
  }
  await createTx.commit()

  console.log(`\nDeleted ${existing.length} project(s), created ${plan.length} project(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
