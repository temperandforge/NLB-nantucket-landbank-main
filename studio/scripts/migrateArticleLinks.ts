/**
 * Replaces `article.link` (the shared link object) with `article.externalUrl` (a plain optional
 * URL), on every article, published and draft.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateArticleLinks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/migrateArticleLinks.ts --with-user-token
 *
 * What it overwrites: `externalUrl` is set from `link.href` only when that is an absolute
 * http(s) address and `externalUrl` is empty. Every `link` is then unset, including internal paths,
 * page references and `#` placeholders, which are listed as "dropped" because an article's own page
 * is now the default destination. Idempotent: articles without `link` are skipped.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Doc = {
  _id: string
  title?: string
  externalUrl?: string
  link: {linkType?: string; href?: string; page?: {_ref: string}}
}

async function main() {
  const docs = await client.fetch<Doc[]>(
    `*[_type == "article" && defined(link)]{_id, title, externalUrl, link}`,
  )
  console.log(`${docs.length} article document(s) have a link${DRY_RUN ? ' (dry run)' : ''}.`)

  const tx = client.transaction()
  for (const doc of docs) {
    const href = doc.link.linkType === 'page' ? undefined : doc.link.href?.trim()
    const external = href && /^https?:\/\//i.test(href) ? href : undefined
    const keep = external && !doc.externalUrl
    console.log(
      `  ${doc._id}  ${doc.title ?? '(no title)'}  ${keep ? `-> externalUrl ${external}` : `dropped (${JSON.stringify(doc.link)})`}`,
    )
    tx.patch(doc._id, (patch) => {
      if (keep) patch = patch.set({externalUrl: external})
      return patch.unset(['link'])
    })
  }
  if (DRY_RUN || docs.length === 0) return

  await tx.commit()
  console.log(`Migrated ${docs.length} document(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
