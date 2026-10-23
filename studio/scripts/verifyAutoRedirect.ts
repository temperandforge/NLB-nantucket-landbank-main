/**
 * Verifies the auto-redirect function's handler logic against an in-memory dataset: it fetches the
 * ancestor chains, descendants and enabled redirects, and builds one transaction. Uses a stub
 * client, so nothing is read from or written to a real dataset.
 *
 *   npx sanity exec scripts/verifyAutoRedirect.ts
 *
 * Imports the real handler module. Does not prove the GROQ runs against Content Lake or that the
 * Functions bundler resolves the shared imports; those need a deploy.
 */

import {applyAutoRedirects, type RedirectClient} from '../functions/auto-redirect/index'

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) console.log(`ok   ${name}`)
  else {
    failed++
    console.log(`FAIL ${name}\n     expected ${e}\n     actual   ${a}`)
  }
}

type Page = {_id: string; slug: string; parent?: string; pathOnly?: boolean}
type Redirect = {_id: string; source: string; enabled?: boolean}

// about-us > history > early-years ; about-us > team ; orphan child of an unpublished parent
const pages: Page[] = [
  {_id: 'about', slug: 'about-us'},
  {_id: 'hist', slug: 'history', parent: 'about'},
  {_id: 'early', slug: 'early-years', parent: 'hist'},
  {_id: 'team', slug: 'team', parent: 'about'},
  {_id: 'lost', slug: 'lost', parent: 'ghost'},
]

function stub(redirects: Redirect[]) {
  const writes: unknown[] = []
  const client = {
    fetch: async (query: string, params: Record<string, unknown> = {}) => {
      if (query.includes('_id == $id')) {
        const p = pages.find((x) => x._id === params.id)
        return p ? {slug: p.slug, parentId: p.parent ?? null} : null
      }
      if (query.includes('parent._ref in $parentIds')) {
        return pages
          .filter((x) => x.parent && (params.parentIds as string[]).includes(x.parent))
          .map((x) => ({_id: x._id, slug: x.slug, pathOnly: !!x.pathOnly, parentId: x.parent}))
      }
      if (query.includes('_type == "redirect"')) {
        if (!query.includes('coalesce(enabled, true) == true'))
          throw new Error('must fetch enabled only')
        return redirects
          .filter((r) => r.enabled !== false)
          .map((r) => ({id: r._id, source: r.source}))
      }
      throw new Error(`unexpected query ${query}`)
    },
    transaction: () => {
      const tx = {
        create: (doc: unknown) => (writes.push({create: doc}), tx),
        patch: (id: string, op: unknown) => (writes.push({patch: id, op}), tx),
        commit: async () => undefined,
      }
      return tx
    },
  } as unknown as RedirectClient
  return {client, writes}
}

const quiet = () => {}
const snap = (slug: string, parentId: string | null = null, pathOnly = false) => ({
  slug,
  parentId,
  pathOnly,
})

async function main() {
  // An unchanged path (e.g. only a pathOnly-neutral edit) writes nothing.
  {
    const {client, writes} = stub([])
    const result = await applyAutoRedirects(
      {id: 'about', before: snap('about-us'), after: snap('about-us')},
      client,
      quiet,
    )
    check(
      'no change in path writes nothing',
      [result, writes.length],
      [{created: 0, disabled: 0}, 0],
    )
  }
  // Ancestor rename: the page and every descendant get a redirect.
  {
    const {client, writes} = stub([])
    const result = await applyAutoRedirects(
      {id: 'about', before: snap('company'), after: snap('about-us')},
      client,
      quiet,
    )
    check('ancestor rename creates 4 redirects', result, {created: 4, disabled: 0})
    check(
      'sources',
      writes.map((w) => (w as {create: {source: string}}).create.source),
      ['/company', '/company/history', '/company/team', '/company/history/early-years'],
    )
    check('created document shape', writes[0], {
      create: {
        _type: 'redirect',
        source: '/company',
        origin: 'auto',
        statusCode: 301,
        passQuery: true,
        enabled: true,
        destination: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: 'about'}},
      },
    })
  }
  // Move: leaf moves under a different parent.
  {
    const {client, writes} = stub([])
    const result = await applyAutoRedirects(
      {id: 'team', before: snap('team', null), after: snap('team', 'about')},
      client,
      quiet,
    )
    check(
      'move creates one redirect',
      [result, (writes[0] as {create: {source: string}}).create.source],
      [{created: 1, disabled: 0}, '/team'],
    )
  }
  // Rename back: the old redirect now shadows a live page and is disabled.
  {
    const {client, writes} = stub([
      {_id: 'r1', source: '/about-us'},
      {_id: 'r2', source: '/off', enabled: false},
    ])
    const result = await applyAutoRedirects(
      {id: 'about', before: snap('company'), after: snap('about-us')},
      client,
      quiet,
    )
    check('rename back disables the shadowing redirect', result, {created: 4, disabled: 1})
    check('disable patch', writes.at(-1), {patch: 'r1', op: {set: {enabled: false}}})
  }
  // First publish of a page that something redirects from.
  {
    const {client, writes} = stub([{_id: 'r1', source: '/about-us'}])
    const result = await applyAutoRedirects(
      {id: 'about', before: null, after: snap('about-us')},
      client,
      quiet,
    )
    check(
      'first publish only disables',
      [result, writes],
      [{created: 0, disabled: 1}, [{patch: 'r1', op: {set: {enabled: false}}}]],
    )
  }
  // Unresolvable parent chain: skip, write nothing.
  {
    const {client, writes} = stub([])
    const result = await applyAutoRedirects(
      {id: 'lost', before: snap('old', 'ghost'), after: snap('lost', 'ghost')},
      client,
      quiet,
    )
    check('unpublished parent skips', [result, writes.length], [{created: 0, disabled: 0}, 0])
  }

  if (failed) {
    console.log(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nall checks passed')
}

main()
