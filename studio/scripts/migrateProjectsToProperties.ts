/**
 * Copies every `project` document into a `property` document, in the same publish state, so the
 * map and the Properties archive can read `property`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token -- --dry
 *   npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token
 *   npx sanity exec scripts/verifyPropertyMigration.ts --with-user-token
 *
 * What it writes: one `property` per project (Sanity generates every id, per the project rule). A
 * published project becomes a published property; one with unpublished edits also gets that draft;
 * a draft-only project becomes a draft. Images are the same assets (not re-uploaded) and taxonomy
 * references are copied as they are.
 *
 * Idempotent and non-destructive: a project is matched on its slug; if a property with that slug
 * exists the project is skipped and the property is NEVER edited. The `project` documents are left
 * in place; delete them yourself once the map is checked.
 *
 * It REFUSES to run (dry or real) if any document other than a project references a project,
 * because re-pointing references is not built: nothing referenced a project when it was written.
 *
 * --dry prints the plan and writes nothing (except migration-plan.json). A report mapping each
 * project to its property is written to scripts/data/migrations/ (git-ignored).
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {planProperties, type SourceDoc} from './migrations/projectsToProperties'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const DATA_DIR = resolve(__dirname, 'data/migrations')

async function main() {
  const projects = await client.fetch<SourceDoc[]>(`*[_type == "project"]`)
  console.log(`${projects.length} project document(s) found.`)

  const referrers = await client.fetch<Array<{_id: string; _type: string}>>(
    `*[_type != "project" && references(*[_type == "project"]._id)]{_id, _type}`,
  )
  if (referrers.length > 0) {
    console.error('Refusing to migrate: these documents reference a project, and re-pointing is not built:')
    referrers.forEach((doc) => console.error(`  ${doc._type} ${doc._id}`))
    process.exit(1)
  }

  const existing = await client.fetch<Array<{slug?: string}>>(`*[_type == "property"]{"slug": slug.current}`)
  const existingSlugs = new Set(existing.flatMap((doc) => (doc.slug ? [doc.slug] : [])))

  const {create, skipped, issues} = planProperties(projects, existingSlugs)
  console.log(
    `Plan: ${create.length} to create (${create.filter((p) => p.published).length} published, ${
      create.filter((p) => p.draft).length
    } with a draft), ${skipped.length} skipped, ${issues.length} issue(s).`,
  )
  issues.forEach((issue) => console.log(`  ! ${issue}`))
  skipped.forEach((item) => console.log(`  = ${item.slug}: ${item.reason}`))

  const created: Array<{slug: string; sourceId: string; propertyId: string; draft: boolean}> = []
  for (const item of create) {
    if (DRY_RUN) {
      console.log(
        `  [dry run] would create ${item.slug}${item.published ? ' (published)' : ''}${item.draft ? ' (draft)' : ''}`,
      )
      continue
    }
    let propertyId: string
    if (item.published) {
      const doc = await client.create({_type: 'property', ...item.published} as never)
      propertyId = doc._id
      if (item.draft) {
        await client.createOrReplace({...item.draft, _id: `drafts.${propertyId}`, _type: 'property'} as never)
      }
    } else {
      const doc = await client.create({_id: 'drafts.', _type: 'property', ...item.draft} as never)
      propertyId = doc._id.replace(/^drafts\./, '')
    }
    console.log(`  + ${item.slug} (${propertyId})`)
    created.push({slug: item.slug, sourceId: item.sourceId, propertyId, draft: Boolean(item.draft)})
  }

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${DRY_RUN ? create.length : created.length} created.`)
  mkdirSync(DATA_DIR, {recursive: true})
  writeFileSync(
    resolve(DATA_DIR, DRY_RUN ? 'migration-plan.json' : 'migration-report.json'),
    JSON.stringify({at: new Date().toISOString(), issues, skipped, created}, null, 2),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
