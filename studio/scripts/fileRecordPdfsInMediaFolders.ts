/**
 * Files the PDF behind every `record` into the Media plugin's folders: "Public Records" with one
 * sub-folder per record category (Policies, Meeting Minutes, Annual Reports, Meeting Agendas, ...).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/fileRecordPdfsInMediaFolders.ts --with-user-token -- --dry
 *   npx sanity exec scripts/fileRecordPdfsInMediaFolders.ts --with-user-token
 *
 * What it writes: `media.folder` documents (Sanity generates the ids; matched on name and parent, so
 * an existing folder is reused and never renamed) and sets `opt.media.folder` on file assets. Nothing
 * else is touched: no record, category or file content changes.
 *
 * Non-destructive and idempotent:
 *  - an asset that already has a folder is left where it is, so a file someone filed by hand stays put;
 *  - a record titled "[Sample] ..." is ignored, so the shared sample PDF is not filed;
 *  - an asset used by records in two different categories is left unfiled and reported, since it
 *    belongs in neither folder alone;
 *  - a category with no records gets no folder.
 * --dry prints the plan and writes nothing.
 *
 * The folder name is the category's title, so a renamed category creates a new folder on the next run
 * rather than moving files. Only records are considered; files in other fields are not filed.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const ROOT_NAME = 'Public Records'
const SAMPLE_PREFIX = '[Sample]'

type RecordRow = {
  _id: string
  title: string | null
  assetId: string | null
  categoryId: string | null
  categoryTitle: string | null
  assetFolder: string | null
}

type Folder = {_id: string; name: string; parentId: string | null}

async function main() {
  const rows = await client.fetch<RecordRow[]>(`*[_type == "record"]{
    _id,
    title,
    "assetId": file.asset._ref,
    "categoryId": string::split(category._ref, "drafts.")[-1],
    "categoryTitle": *[_type == "recordCategory" && _id == string::split(^.category._ref, "drafts.")[-1]][0].title,
    "assetFolder": *[_id == ^.file.asset._ref][0].opt.media.folder._ref
  }`)

  const considered = rows.filter((row) => row.assetId && row.categoryTitle && !row.title?.startsWith(SAMPLE_PREFIX))
  console.log(`${rows.length} records, ${considered.length} considered (samples and incomplete ones ignored)`)

  // asset -> the one category it belongs to; an asset shared across categories is left alone.
  const byAsset = new Map<string, {category: string; folder: string | null}>()
  const shared = new Set<string>()
  for (const row of considered) {
    const known = byAsset.get(row.assetId!)
    if (known && known.category !== row.categoryTitle) shared.add(row.assetId!)
    else byAsset.set(row.assetId!, {category: row.categoryTitle!, folder: row.assetFolder})
  }
  for (const id of shared) byAsset.delete(id)
  if (shared.size > 0) console.log(`! used in more than one category, left unfiled: ${[...shared].join(', ')}`)

  const folders = await client.fetch<Folder[]>(
    `*[_type == "media.folder" && !(_id in path("drafts.**"))]{_id, name, "parentId": parent._ref}`,
  )
  const find = (name: string, parentId: string | null) =>
    folders.find((folder) => folder.name === name && (folder.parentId ?? null) === parentId)

  const folderFor = async (name: string, parentId: string | null): Promise<string> => {
    const existing = find(name, parentId)
    if (existing) return existing._id
    console.log(`+ ${DRY_RUN ? 'would create' : 'creating'} folder: ${parentId ? `${ROOT_NAME} / ` : ''}${name}`)
    if (DRY_RUN) return `(new:${name})`
    const doc = await client.create({
      _type: 'media.folder',
      name,
      ...(parentId ? {parent: {_type: 'reference', _ref: parentId, _weak: true}} : {}),
    } as never)
    folders.push({_id: doc._id, name, parentId})
    return doc._id
  }

  const categories = [...new Set([...byAsset.values()].map((entry) => entry.category))].sort()
  if (categories.length === 0) {
    console.log('Nothing to file.')
    return
  }

  const rootId = await folderFor(ROOT_NAME, null)
  const categoryFolders = new Map<string, string>()
  for (const category of categories) categoryFolders.set(category, await folderFor(category, rootId))

  const counts = new Map<string, number>()
  let alreadyFiled = 0
  for (const [assetId, {category, folder}] of byAsset) {
    if (folder) {
      alreadyFiled++
      continue
    }
    counts.set(category, (counts.get(category) ?? 0) + 1)
    if (DRY_RUN) continue
    await client
      .patch(assetId)
      .setIfMissing({opt: {}})
      .setIfMissing({'opt.media': {}})
      .set({'opt.media.folder': {_type: 'reference', _ref: categoryFolders.get(category)!, _weak: true}})
      .commit()
  }

  for (const category of categories) {
    console.log(`  ${DRY_RUN ? 'would file' : 'filed'} ${counts.get(category) ?? 0} in ${ROOT_NAME} / ${category}`)
  }
  if (alreadyFiled > 0) console.log(`  ${alreadyFiled} already in a folder, left as is`)
  if (DRY_RUN) console.log('[dry run] nothing written.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
