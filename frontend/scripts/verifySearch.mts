/**
 * Verifies how a search query is read and how results are shaped:
 *
 *   cd frontend && node scripts/verifySearch.mts
 *
 * Imports the real helpers. Exits non-zero on the first failure.
 */
import {
  buildSnippet,
  cleanQuery,
  filterByType,
  highlight,
  parseSearchTerms,
  searchPatterns,
  searchTabs,
  toSearchResults,
} from '../sanity/lib/search.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Terms
check(same(parseSearchTerms('Rain  Garden'), ['rain', 'garden']), 'words are lowercased and split on whitespace')
check(same(parseSearchTerms('rain rain RAIN'), ['rain']), 'repeats collapse')
check(same(parseSearchTerms('Settler’s Landing'), ['settler', 'landing']), 'an apostrophe splits and the stray "s" is dropped')
check(same(parseSearchTerms('a'), ['a']), 'a lone one-letter word is kept')
check(same(parseSearchTerms('  '), []), 'blank gives no terms')
check(same(parseSearchTerms(null), []), 'null gives no terms')
check(same(parseSearchTerms('"*[_type]" -- ()'), ['type']), 'GROQ and wildcard characters are only separators')
check(parseSearchTerms('a b c d e f g h i j k l m n o p'.replace(/ /g, 'x ')).length <= 8, 'at most eight terms')
check(parseSearchTerms('x'.repeat(200))[0].length === 40, 'a term is bounded')
check(same(searchPatterns(['rain', 'garden']), ['rain*', 'garden*']), 'each word becomes a prefix pattern')
check(cleanQuery('  rain \n  garden ') === 'rain garden', 'the echoed query collapses whitespace')
check(cleanQuery('x'.repeat(300)).length === 100, 'the echoed query is bounded')

// Highlight
const marked = highlight('Rain gardens in the rainy season', ['rain'])
check(same(marked.filter((r) => r.match).map((r) => r.text), ['Rain', 'rain']), 'every word that starts with a term is marked')
check(marked.map((r) => r.text).join('') === 'Rain gardens in the rainy season', 'runs rebuild the original text')
check(highlight('Constraint', ['rain']).every((r) => !r.match), 'a term inside a word is not marked')
check(highlight('a (b) c', ['(']).some((r) => r.match && r.text === '('), 'regex characters in a term are literal, not an error')
check(highlight('', ['x']).length === 0, 'no text gives no runs')

// Snippet
const long = `${'Intro words. '.repeat(30)}The rain garden captures runoff. ${'Trailing words. '.repeat(30)}`
const snippet = buildSnippet(long, ['rain'])
check(snippet.some((r) => r.match && r.text === 'rain'), 'the snippet contains the match')
check(snippet.map((r) => r.text).join('').length < 260, 'the snippet is short')
check(snippet[0].text.startsWith('… '), 'a snippet cut at the start has a leading ellipsis')
check(buildSnippet('Short text', ['zzz']).map((r) => r.text).join('') === 'Short text', 'a short text with no match is shown whole')
check(buildSnippet('', ['x']).length === 0, 'no text gives no snippet')

// Results
const rows = [
  {_id: 'a', _type: 'article', title: 'Rain garden news', slug: 'rain-news', path: null, date: '2026-08-02', start: null, externalUrl: null, link: null, fileUrl: null, description: null, body: 'About the rain garden.', blocks: null},
  {_id: 'b', _type: 'page', title: 'Conservation', slug: 'conservation', path: 'about-us/conservation', date: null, start: null, externalUrl: null, link: null, fileUrl: null, description: null, body: null, blocks: ['Rain and soil.', null]},
  {_id: 'c', _type: 'record', title: 'Minutes', slug: null, path: null, date: '2026-01-05', start: null, externalUrl: null, link: null, fileUrl: 'https://cdn.example/minutes.pdf', description: null, body: null, blocks: null},
  {_id: 'd', _type: 'property', title: 'No link', slug: 'no-link', path: null, date: null, start: null, externalUrl: null, link: null, fileUrl: null, description: null, body: null, blocks: null},
  {_id: 'e', _type: 'property', title: 'Placeholder', slug: 'p', path: null, date: null, start: null, externalUrl: null, link: '#', fileUrl: null, description: null, body: null, blocks: null},
  {_id: 'f', _type: 'page', title: 'Orphan', slug: 'orphan', path: null, date: null, start: null, externalUrl: null, link: null, fileUrl: null, description: null, body: null, blocks: null},
  {_id: 'g', _type: 'article', title: 'External story', slug: 'ext', path: null, date: '2026-02-03', start: null, externalUrl: 'https://example.com/story', link: null, fileUrl: null, description: null, body: null, blocks: null},
  {_id: 'h', _type: 'project', title: '  ', slug: 'blank', path: null, date: null, start: null, externalUrl: null, link: null, fileUrl: null, description: null, body: null, blocks: null},
] as unknown as Parameters<typeof toSearchResults>[0]
const results = toSearchResults(rows, ['rain'])
const by = (id: string) => results.find((r) => r.id === id)
check(by('a')?.href === '/news/rain-news' && by('a')?.date === '08/02/2026', 'news links to its page and carries its date')
check(by('b')?.href === '/about-us/conservation', 'a page uses its derived path, never its slug alone')
check(by('b')?.snippet.some((r) => r.match), 'a page snippet comes from its blocks and tolerates null entries')
check(by('c')?.download === true && by('c')?.href === 'https://cdn.example/minutes.pdf', 'a record downloads its file')
check(by('d') === undefined, 'a property with no link is not a result')
check(by('e') === undefined, 'a "#" link is not a destination')
check(by('f') === undefined, 'a page with no path is not a result')
check(by('g')?.href === 'https://example.com/story' && by('g')?.external === true, "an article's own external link wins")
check(by('h') === undefined, 'a result with a blank title is dropped')

// Tabs
const tabs = searchTabs(results)
check(same(tabs.map((t) => t.slug), ['page', 'article', 'record']), 'tabs follow a fixed kind order and only list kinds found')
check(tabs.find((t) => t.slug === 'article')?.title === 'News (2)', 'a tab shows its count')
check(filterByType(results, 'record').length === 1, 'filtering by kind narrows the list')
check(filterByType(results, null).length === results.length, 'no filter shows everything')

process.exit(failed ? 1 : 0)
