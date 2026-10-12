/**
 * Repoints every link whose href is exactly "/map" at the Map page (explore/map), now that the
 * /map route is gone.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/repointMapLinks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/repointMapLinks.ts --with-user-token
 *
 * What it writes: on each document (draft or published) that holds a `link` object with
 * linkType "href" and href "/map", that link becomes linkType "page" with a reference to the
 * published explore/map page. Other fields on the link (such as openInNewTab) are kept; nothing
 * else on the document changes. Idempotent: once repointed there is nothing left to match. Links
 * with a query string or any other path are left alone. Stops without writing if explore/map is
 * not published, because a reference to a draft-only page resolves to nothing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Json = null | boolean | number | string | Json[] | {[key: string]: Json}
type Doc = {_id: string; _type: string; _rev: string; [key: string]: Json}

let pageId = ''

/** Returns a copy of `value` with matching links repointed, and counts them. */
function repoint(value: Json, count: {n: number}): Json {
  if (Array.isArray(value)) return value.map((item) => repoint(item, count))
  if (value && typeof value === 'object') {
    if (value._type === 'link' && value.linkType === 'href' && value.href === '/map') {
      count.n += 1
      const {href: _href, ...rest} = value
      return {...rest, linkType: 'page', page: {_type: 'reference', _ref: pageId}}
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, repoint(v, count)]))
  }
  return value
}

async function main() {
  const target = await client.fetch<string | null>(
    `*[_type == "page" && !(_id in path("drafts.**")) && slug.current == "map" && parent->slug.current == "explore"][0]._id`,
  )
  if (!target) {
    console.error('explore/map is not published. Nothing was written.')
    process.exit(1)
  }
  pageId = target

  const docs = await client.fetch<Doc[]>(`*[!(_type match "system.*") && !(_type match "sanity.*")]`)
  let total = 0
  for (const doc of docs) {
    const count = {n: 0}
    const {_id, _type, _rev, _createdAt: _c, _updatedAt: _u, ...fields} = doc as Doc & {
      _createdAt?: Json
      _updatedAt?: Json
    }
    const next = repoint(fields as Json, count) as {[key: string]: Json}
    if (count.n === 0) continue
    total += count.n
    console.log(`  ${DRY_RUN ? '[dry run] would repoint' : 'repointing'} ${count.n} link(s) in ${_type} ${_id}`)
    if (DRY_RUN) continue
    const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(fields[k]))
    await client
      .patch(_id)
      .ifRevisionId(_rev)
      .set(Object.fromEntries(changed.map((k) => [k, next[k]])))
      .commit()
  }
  console.log(total === 0 ? '  = no "/map" links found' : `  ${total} link(s) ${DRY_RUN ? 'found' : 'repointed'}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
