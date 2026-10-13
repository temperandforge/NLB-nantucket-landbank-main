import {formatDate, eventDateLabel} from './dates.ts'
import type {FilterTab} from '@/sanity/lib/archiveFilter'
import type {SearchQueryResult} from '@/sanity.types'

/**
 * Site search: turning what a visitor typed into a GROQ match, and the rows GROQ returns into
 * something a results list can render. Pure, so scripts/verifySearch.mts can exercise it.
 */

export const SEARCH_PARAM = 'q'
export const SEARCH_TYPE_PARAM = 'type'
export const SEARCH_FILTER_LABEL = 'Filter results by type'

/** How many results one search returns. The query asks for one more, to know whether it was cut. */
export const SEARCH_LIMIT = 50
const MAX_TERMS = 8
const MAX_TERM_LENGTH = 40
const MAX_QUERY_LENGTH = 100

/**
 * The words in a query. Anything that is not a letter or a number splits words (so an apostrophe
 * is a separator: "Settler's" is the index's "settler" and "s"), and one-letter fragments are
 * dropped unless they are all there is. Case is ignored by the search itself.
 */
export function parseSearchTerms(raw: string | null | undefined): string[] {
  const words = (raw ?? '')
    .slice(0, MAX_QUERY_LENGTH * 2)
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.slice(0, MAX_TERM_LENGTH))
  const unique = [...new Set(words)]
  const meaningful = unique.filter((word) => word.length > 1)
  return (meaningful.length > 0 ? meaningful : unique).slice(0, MAX_TERMS)
}

/**
 * The patterns GROQ's `match` takes: each word as a prefix, so a half-typed word still finds
 * things. An array means every pattern must match.
 */
export function searchPatterns(terms: string[]): string[] {
  return terms.map((term) => `${term}*`)
}

/** The query as it is echoed back to the visitor: trimmed, bounded, whitespace collapsed. */
export function cleanQuery(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
}

export const SEARCH_TYPES = ['page', 'article', 'project', 'event', 'property', 'record'] as const
export type SearchType = (typeof SEARCH_TYPES)[number]

// Singular names the type label shows on a result, plural names the filter tabs show.
const TYPE_LABEL: Record<SearchType, {singular: string; plural: string}> = {
  page: {singular: 'Page', plural: 'Pages'},
  article: {singular: 'News', plural: 'News'},
  project: {singular: 'Project', plural: 'Projects'},
  event: {singular: 'Event', plural: 'Events'},
  property: {singular: 'Property', plural: 'Properties'},
  record: {singular: 'Record', plural: 'Records'},
}

/** A run of text, flagged when it is a part the visitor searched for. */
export type TextRun = {text: string; match: boolean}

export type SearchResult = {
  id: string
  type: SearchType
  typeLabel: string
  title: TextRun[]
  /** Date text where the type has one ("08/02/2026"); empty otherwise. */
  date: string
  snippet: TextRun[]
  href: string
  /** A record is a file to download rather than a page to open. */
  download: boolean
  /** A property's link and an uploaded file are outside the site's own routes. */
  external: boolean
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Splits text into runs, flagging each place a search term starts a word. */
export function highlight(text: string, terms: string[]): TextRun[] {
  if (!text) return []
  if (terms.length === 0) return [{text, match: false}]
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegExp).join('|')})`,
    'giu',
  )
  const runs: TextRun[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0
    if (start > last) runs.push({text: text.slice(last, start), match: false})
    runs.push({text: found[0], match: true})
    last = start + found[0].length
  }
  if (last < text.length) runs.push({text: text.slice(last), match: false})
  return runs
}

const SNIPPET_LENGTH = 190
const SNIPPET_LEAD = 60

/**
 * A short excerpt of `text` around the first place a term starts a word, or its opening when no
 * term is in it (the title matched). Starts and ends on word boundaries, with an ellipsis where it
 * was cut, and flags the matches.
 */
export function buildSnippet(text: string, terms: string[]): TextRun[] {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return []
  const first = highlight(flat, terms).find((run) => run.match)
  const hit = first ? flat.indexOf(first.text, 0) : -1
  let start = 0
  if (hit > SNIPPET_LEAD) {
    start = hit - SNIPPET_LEAD
    const space = flat.indexOf(' ', start)
    if (space !== -1 && space < hit) start = space + 1
  }
  let end = Math.min(flat.length, start + SNIPPET_LENGTH)
  if (end < flat.length) {
    const space = flat.lastIndexOf(' ', end)
    if (space > start + SNIPPET_LENGTH / 2) end = space
  }
  const excerpt = `${start > 0 ? '… ' : ''}${flat.slice(start, end)}${end < flat.length ? '\u00a0…' : ''}`
  return highlight(excerpt, terms)
}

type Row = SearchQueryResult[number]

/**
 * A usable destination: not blank and not the "#" placeholder. The query is fetched without stega
 * (see the search page), so the value needs no cleaning; utils.ts's realHref does the same check
 * but pulls in the Sanity client config, which the verify script cannot load.
 */
function realHref(href: string | null | undefined): string | null {
  const value = href?.trim()
  return value && value !== '#' ? value : null
}

/** The text a result's snippet is drawn from, richest source first. */
function snippetSource(row: Row): string {
  const blocks = (row.blocks ?? []).filter((block): block is string => typeof block === 'string')
  return [row.description, row.body, ...blocks].filter(Boolean).join(' ')
}

function hrefFor(row: Row): {href: string; external: boolean} | null {
  switch (row._type) {
    case 'page':
      return row.path ? {href: `/${row.path}`, external: false} : null
    case 'article': {
      const own = realHref(row.externalUrl)
      if (own) return {href: own, external: /^https?:\/\//i.test(own)}
      return row.slug ? {href: `/news/${row.slug}`, external: false} : null
    }
    case 'project':
      return row.slug ? {href: `/projects/${row.slug}`, external: false} : null
    case 'event':
      return row.slug ? {href: `/events/${row.slug}`, external: false} : null
    case 'property': {
      // A property has no page of its own; it is a result only when it links somewhere.
      const link = realHref(row.link)
      return link ? {href: link, external: /^https?:\/\//i.test(link)} : null
    }
    case 'record':
      return row.fileUrl ? {href: row.fileUrl, external: true} : null
    default:
      return null
  }
}

function dateFor(row: Row): string {
  if (row._type === 'event') return eventDateLabel(row.start)
  if (row._type === 'article' || row._type === 'record') return formatDate(row.date)
  return ''
}

/**
 * Rows from the search query as render-ready results. A row with no title or no destination is
 * dropped, never shown as a dead result.
 */
export function toSearchResults(rows: SearchQueryResult, terms: string[]): SearchResult[] {
  return rows.flatMap((row) => {
    const type = row._type as SearchType
    const where = hrefFor(row)
    const title = row.title?.trim()
    if (!where || !title || !(type in TYPE_LABEL)) return []
    return [
      {
        id: row._id,
        type,
        typeLabel: TYPE_LABEL[type].singular,
        title: highlight(title, terms),
        date: dateFor(row),
        snippet: buildSnippet(snippetSource(row), terms),
        href: where.href,
        download: type === 'record',
        external: where.external,
      },
    ]
  })
}

/** One tab per kind of result found, in the order the kinds are listed above, counted. */
export function searchTabs(results: ReadonlyArray<Pick<SearchResult, 'type'>>): FilterTab[] {
  const counts = new Map<SearchType, number>()
  for (const {type} of results) counts.set(type, (counts.get(type) ?? 0) + 1)
  return SEARCH_TYPES.filter((type) => counts.has(type)).map((type) => ({
    slug: type,
    title: `${TYPE_LABEL[type].plural} (${counts.get(type)})`,
  }))
}

export function filterByType<T extends Pick<SearchResult, 'type'>>(results: T[], slug: string | null): T[] {
  return slug ? results.filter((result) => result.type === slug) : results
}
