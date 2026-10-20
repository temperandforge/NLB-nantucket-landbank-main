/**
 * Deletes EVERY `property` document - published documents and drafts - so the Properties archive
 * can be rebuilt from scratch. It creates nothing.
 *
 * Run from the studio directory, dry first, and read the plan before the real run:
 *   npx sanity exec scripts/removeAllProperties.ts --with-user-token -- --dry
 *   npx sanity exec scripts/removeAllProperties.ts --with-user-token
 *
 * What it deletes: every document of type `property`, including each one's description, image,
 * gallery, property types, resources and FAQs. PERMANENT. Image and file assets are left in the
 * asset store; only the documents go. Before deleting it writes every document it will remove to
 * scripts/data/migrations/removed-properties-<timestamp>.json (git-ignored) so they can be restored.
 *
 * It REFUSES to run if any other document references a property it would delete (a featured
 * properties block, a map teaser, a menu link, a project's `property`), listing each one, so no page
 * is left holding a broken reference. Clear or repoint those first, then run again.
 *
 * Properties Settings (`projectSettings`) and the boundary file are not touched.
 *
 * --dry prints the plan and writes and deletes nothing.
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

// Raw perspective, so drafts and versions are seen alongside published documents.
const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Doc = {_id: string; _type: string; name?: string; slug?: {current?: string}}

async function main() {
  const properties = await client.fetch<Doc[]>(`*[_type == "property"]`)
  const published = properties.filter((doc) => !doc._id.startsWith('drafts.')).length
  console.log(
    `${properties.length} property document(s): ${published} published, ${properties.length - published} draft.`,
  )
  if (properties.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  const ids = properties.map((doc) => doc._id)
  const referrers = await client.fetch<Array<{_id: string; _type: string; title?: string}>>(
    `*[!(_id in $ids) && references($ids)]{_id, _type, "title": coalesce(title, name)}`,
    {ids},
  )

  if (referrers.length > 0) {
    referrers.forEach((doc) =>
      console.error(`  ! referenced by ${doc._type} ${doc._id}${doc.title ? ` (${doc.title})` : ''}`),
    )
    console.error(
      `Refusing to delete: ${referrers.length} other document(s) reference a property (the lines marked ! above).`,
    )
    process.exit(1)
  }

  if (DRY_RUN) {
    properties.forEach((doc) => console.log(`  [dry run] would delete ${doc._id} (${doc.name ?? 'untitled'})`))
    console.log(`[dry run] ${properties.length} document(s) would be deleted; nothing written.`)
    return
  }

  const dir = resolve(__dirname, 'data/migrations')
  mkdirSync(dir, {recursive: true})
  const backup = resolve(dir, `removed-properties-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(backup, JSON.stringify(properties, null, 2))
  console.log(`Backed up ${properties.length} document(s) to ${backup}`)

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
