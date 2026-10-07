/**
 * Imports the staff and commissioners extracted from the WordPress site (extractPeople.sh) as
 * DRAFTS: people, their headshots, and the three departments.
 *
 * Run from the studio directory:
 *   scripts/wordpress/extractPeople.sh                  (once, read-only; writes people.json)
 *   npx sanity exec scripts/wordpress/importWordpressPeople.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importWordpressPeople.ts --with-user-token
 *   npx sanity exec scripts/wordpress/importWordpressPeople.ts --with-user-token -- --remove-samples
 *   npx sanity exec scripts/wordpress/verifyWordpressPeople.ts --with-user-token
 *
 * What it writes: draft `staffMember`, `commissioner` and `department` documents (Sanity generates
 * every id, per the project rule), plus the headshots, uploaded from the WordPress uploads folder
 * on disk (content-addressed, so a re-run reuses them). People reference their department with a
 * weak reference that strengthens on publish, as Studio does for a draft-only target.
 *
 * Idempotent and non-destructive: a person is matched on its name within its type (case, spacing
 * and entities ignored), a department on its slug, among published documents and drafts. Anything
 * found is skipped and NEVER edited, so a re-run cannot overwrite an editor's changes.
 *
 * --dry prints the plan and writes nothing (except import-plan.json). --remove-samples ALSO
 * deletes the five sample people seeded earlier (seedPhaseBContent.ts), matched by their exact
 * names, printing each first; it never touches a real person or a department. A report of every
 * WordPress id and its Sanity id is written to scripts/data/wordpress/ (git-ignored).
 */

import {createReadStream, existsSync, readFileSync, writeFileSync} from 'node:fs'
import {basename, resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {normalizeName, planDepartments, planPeople, type Snapshot} from './people'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const REMOVE_SAMPLES = process.argv.includes('--remove-samples')
const DATA_DIR = resolve(__dirname, '../data/wordpress')

const SAMPLE_PEOPLE: Array<{type: 'staffMember' | 'commissioner'; names: string[]}> = [
  {type: 'staffMember', names: ['Alex Example', 'Sam Sample', 'Pat Placeholder']},
  {type: 'commissioner', names: ['Jordan Example', 'Riley Sample']},
]

const published = (id: string) => id.replace(/^drafts\./, '')

async function existingByName(type: string) {
  const rows = await client.fetch<Array<{_id: string; name?: string}>>(
    `*[_type == $type]{_id, name}`,
    {type},
  )
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.name) map.set(normalizeName(row.name), published(row._id))
  }
  return map
}

async function main() {
  const snapshotPath = resolve(DATA_DIR, 'people.json')
  if (!existsSync(snapshotPath)) {
    console.error('No people.json: run scripts/wordpress/extractPeople.sh first. Nothing was written.')
    process.exit(1)
  }
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Snapshot
  const {people, issues} = planPeople(snapshot)
  const departments = planDepartments(snapshot.departments)

  console.log(`Plan: ${people.length} people, ${departments.length} departments.`)
  issues.forEach((issue) => console.log(`  ! ${issue}`))

  // Departments first: people reference them.
  const departmentIds = new Map<string, string>()
  const existingDepartments = await client.fetch<Array<{_id: string; slug?: string}>>(
    `*[_type == "department"]{_id, "slug": slug.current}`,
  )
  for (const row of existingDepartments) {
    if (row.slug) departmentIds.set(row.slug, published(row._id))
  }
  const createdDepartments: Array<{slug: string; sanityId: string}> = []
  for (const department of departments) {
    if (departmentIds.has(department.slug)) {
      console.log(`  = department exists: ${department.slug}`)
      continue
    }
    if (DRY_RUN) {
      console.log(`  [dry run] would create department: ${department.title}`)
      departmentIds.set(department.slug, `dry-${department.slug}`)
      continue
    }
    const created = await client.create({
      _id: 'drafts.',
      _type: 'department',
      title: department.title,
      slug: {_type: 'slug', current: department.slug},
      order: department.order,
    } as never)
    console.log(`  + department created: ${department.title} (${created._id})`)
    departmentIds.set(department.slug, published(created._id))
    createdDepartments.push({slug: department.slug, sanityId: created._id})
  }

  const existing = {
    staffMember: await existingByName('staffMember'),
    commissioner: await existingByName('commissioner'),
  }

  const created: Array<{wpId: number; type: string; name: string; sanityId: string; photo: boolean}> = []
  const skipped: Array<{wpId: number; type: string; name: string; sanityId: string}> = []

  for (const person of people) {
    const found = existing[person.type].get(normalizeName(person.name))
    if (found) {
      console.log(`  = exists: ${person.type} ${person.name}`)
      skipped.push({wpId: person.wpId, type: person.type, name: person.name, sanityId: found})
      continue
    }
    if (DRY_RUN) {
      console.log(
        `  [dry run] would create ${person.type}: ${person.name}${person.photoPath ? ' (with photo)' : ' (no photo)'}`,
      )
      continue
    }

    let headshot: Record<string, unknown> | undefined
    if (person.photoPath) {
      const asset = await client.assets.upload('image', createReadStream(person.photoPath), {
        filename: basename(person.photoPath),
      })
      headshot = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
    }

    const base = {_id: 'drafts.', _type: person.type, name: person.name, order: person.order}
    const doc =
      person.type === 'staffMember'
        ? {
            ...base,
            ...(person.title ? {title: person.title} : {}),
            ...(person.departmentSlug
              ? {
                  department: {
                    _type: 'reference',
                    _ref: departmentIds.get(person.departmentSlug),
                    _weak: true,
                    _strengthenOnPublish: {type: 'department'},
                  },
                }
              : {}),
            ...(headshot ? {headshot} : {}),
          }
        : {
            ...base,
            ...(person.title ? {title: person.title} : {}),
            ...(person.termDate ? {termDate: person.termDate} : {}),
            ...(headshot ? {headshot} : {}),
          }
    const result = await client.create(doc as never)
    console.log(`  + ${person.type} created: ${person.name} (${result._id})`)
    created.push({
      wpId: person.wpId,
      type: person.type,
      name: person.name,
      sanityId: result._id,
      photo: Boolean(headshot),
    })
  }

  console.log(
    `${DRY_RUN ? '[dry run] ' : ''}${created.length} created, ${skipped.length} already existed.`,
  )

  writeFileSync(
    resolve(DATA_DIR, DRY_RUN ? 'import-plan.json' : 'import-report.json'),
    JSON.stringify({at: new Date().toISOString(), issues, createdDepartments, created, skipped}, null, 2),
  )

  if (REMOVE_SAMPLES) await removeSamples()
}

async function removeSamples() {
  const ids: string[] = []
  for (const {type, names} of SAMPLE_PEOPLE) {
    const rows = await client.fetch<Array<{_id: string; name: string}>>(
      `*[_type == $type && name in $names]{_id, name}`,
      {type, names},
    )
    for (const row of rows) {
      console.log(`  - sample ${type}: ${row.name} (${row._id})`)
      ids.push(row._id)
    }
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${ids.length} sample document(s) ${DRY_RUN ? 'would be ' : ''}deleted.`)
  if (DRY_RUN || ids.length === 0) return
  const transaction = client.transaction()
  ids.forEach((id) => transaction.delete(id))
  await transaction.commit()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
