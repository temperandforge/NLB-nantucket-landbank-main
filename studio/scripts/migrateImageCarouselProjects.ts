/**
 * Moves the Image Carousel block's hand-picked `projects` into its new `gallery` list, and renames
 * `source: "category"` to `"projectCategory"` (DECISIONS 28, issue #114).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateImageCarouselProjects.ts --with-user-token -- --dry
 *   npx sanity exec scripts/migrateImageCarouselProjects.ts --with-user-token
 *
 * What it overwrites: on `imageCarousel` blocks of `page` documents (published and draft), only
 * three fields. `gallery` gets one `relatedDocument` entry per project, in order, skipping any
 * project already in it; `source` becomes `projectCategory` when it was `category`; `projects` is
 * unset. Projects are migrated even in category mode, where they are hidden, so nothing is lost if an
 * editor switches back to hand-picked. Idempotent: a block with neither `projects` nor
 * `source: "category"` is left alone.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 12)

type Block = {
  _key: string
  source?: string
  projects?: {_ref: string}[]
  gallery?: {_ref?: string}[]
}
type Page = {_id: string; slug?: string; blocks: Block[]}

async function main() {
  const pages = await client.fetch<Page[]>(
    `*[_type == "page" && count(pageBuilder[_type == "imageCarousel" && (defined(projects) || source == "category")]) > 0]{
      _id,
      "slug": slug.current,
      "blocks": pageBuilder[_type == "imageCarousel" && (defined(projects) || source == "category")]{_key, source, projects, gallery}
    }`,
  )
  const count = pages.reduce((n, page) => n + page.blocks.length, 0)
  console.log(`${count} block(s) on ${pages.length} page document(s) to migrate${DRY_RUN ? ' (dry run)' : ''}.`)

  const tx = client.transaction()
  for (const page of pages) {
    for (const block of page.blocks) {
      const at = `pageBuilder[_key=="${block._key}"]`
      const have = new Set((block.gallery ?? []).map((entry) => entry._ref))
      const entries = (block.projects ?? [])
        .filter((project) => project?._ref && !have.has(project._ref))
        .map((project) => ({_key: key(), _type: 'relatedDocument', _ref: project._ref}))
      const rename = block.source === 'category'
      console.log(
        `  ${page._id} (${page.slug ?? 'no slug'}) block ${block._key}: ` +
          `${entries.length} project(s) -> gallery${rename ? ', source category -> projectCategory' : ''}`,
      )
      tx.patch(page._id, (patch) => {
        if (entries.length > 0) patch = patch.setIfMissing({[`${at}.gallery`]: []}).append(`${at}.gallery`, entries)
        if (rename) patch = patch.set({[`${at}.source`]: 'projectCategory'})
        return patch.unset([`${at}.projects`])
      })
    }
  }
  if (DRY_RUN || count === 0) return

  await tx.commit()
  console.log(`Migrated ${count} block(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
