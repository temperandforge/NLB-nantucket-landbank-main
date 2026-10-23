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
type Redirect = {_id: string; source: string; enabled?: boolean; origin?: string}

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
  const events: string[] = []
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
        if (query.includes('coalesce(enabled, true) == false')) {
          return redirects
            .filter((r) => r.enabled === false)
            .map((r) => ({id: r._id, source: r.source, origin: r.origin ?? null}))
        }
        if (!query.includes('coalesce(enabled, true) == true'))
          throw new Error('unexpected redirect query')
        return redirects
          .filter((r) => r.enabled !== false)
          .map((r) => ({id: r._id, source: r.source}))
      }
      throw new Error(`unexpected query ${query}`)
    },
    transaction: () => {
      const tx = {
        create: (doc: unknown) => (writes.push({create: doc}), events.push('mutation'), tx),
        patch: (id: string, op: unknown) => (
          writes.push({patch: id, op}),
          events.push('mutation'),
          tx
        ),
        commit: async () => (events.push('commit'), undefined),
      }
      return tx
    },
  } as unknown as RedirectClient
  return {client, writes, events}
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
      [{created: 0, disabled: 0, reenabled: 0}, 0],
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
    check('ancestor rename creates 4 redirects', result, {created: 4, disabled: 0, reenabled: 0})
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
      [{created: 1, disabled: 0, reenabled: 0}, '/team'],
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
    check('rename back disables the shadowing redirect', result, {
      created: 4,
      disabled: 1,
      reenabled: 0,
    })
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
      [{created: 0, disabled: 1, reenabled: 0}, [{patch: 'r1', op: {set: {enabled: false}}}]],
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
    check(
      'unpublished parent skips',
      [result, writes.length],
      [{created: 0, disabled: 0, reenabled: 0}, 0],
    )
  }

  // Flip-flop A -> B -> A -> B: /company is disabled (auto) from the B -> A step, /about-us is the
  // live redirect from it. The third rename must re-enable /company, not create a second one.
  {
    const {client, writes, events} = stub([
      {_id: 'r1', source: '/company', enabled: false, origin: 'auto'},
      {_id: 'r2', source: '/about-us', origin: 'auto'},
    ])
    const result = await applyAutoRedirects(
      {id: 'about', before: snap('company'), after: snap('about-us')},
      client,
      quiet,
    )
    check('flip-flop result', result, {created: 3, disabled: 1, reenabled: 1})
    const sources = writes.flatMap((w) =>
      'create' in (w as object) ? [(w as any).create.source] : [],
    )
    check('flip-flop makes no second /company', sources, [
      '/company/history',
      '/company/team',
      '/company/history/early-years',
    ])
    check('flip-flop re-enables the existing document', writes[3], {
      patch: 'r1',
      op: {
        set: {
          enabled: true,
          destination: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: 'about'}},
          origin: 'auto',
          statusCode: 301,
          passQuery: true,
        },
      },
    })
    check('flip-flop disables the shadowing /about-us', writes[4], {
      patch: 'r2',
      op: {set: {enabled: false}},
    })
    check(
      'exactly one commit, after all mutations',
      [events.filter((e) => e === 'commit').length, events.at(-1), writes.length],
      [1, 'commit', 5],
    )
  }
  // A manually disabled redirect for a planned source is left alone.
  {
    const logs: string[] = []
    const {client, writes, events} = stub([
      {_id: 'm1', source: '/company', enabled: false, origin: 'manual'},
    ])
    const result = await applyAutoRedirects(
      {id: 'about', before: snap('company'), after: snap('about-us')},
      client,
      (...args) => logs.push(args.join(' ')),
    )
    check('manual disable result', result, {created: 3, disabled: 0, reenabled: 0})
    check(
      'no write touches the manual redirect or its source',
      writes.some(
        (w) => JSON.stringify(w).includes('m1') || (w as any).create?.source === '/company',
      ),
      false,
    )
    check(
      'manual disable is logged',
      logs.filter((l) => l.includes('manually disabled redirect for /company')).length,
      1,
    )
    check('one commit', events.filter((e) => e === 'commit').length, 1)
  }

  if (failed) {
    console.log(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log('\nall checks passed')
}

main()
