import type {Metadata} from 'next'

import SearchField from '@/components/search/SearchField'
import SearchResults from '@/components/search/SearchResults'
import {sanityFetch} from '@/sanity/lib/live'
import {searchQuery} from '@/sanity/lib/queries'
import {
  SEARCH_LIMIT,
  SEARCH_PARAM,
  cleanQuery,
  parseSearchTerms,
  searchPatterns,
  toSearchResults,
} from '@/sanity/lib/search'

/**
 * Site search, /search?q=<words>. A static route, so it wins over the catch-all that owns CMS
 * pages: a CMS page cannot be published at /search. Read on every request (it depends on the
 * query string); results are fetched on the server, so the page works without JavaScript and a
 * results address can be shared. Kept out of search engines: a results page is not content.
 */

type SearchPageProps = PageProps<'/search'>

function queryFrom(value: string | string[] | undefined): string {
  return cleanQuery(Array.isArray(value) ? value[0] : value)
}

export async function generateMetadata(props: SearchPageProps): Promise<Metadata> {
  const query = queryFrom((await props.searchParams)[SEARCH_PARAM])
  return {title: query ? `Search: ${query}` : 'Search', robots: {index: false, follow: true}}
}

export default async function SearchPage(props: SearchPageProps) {
  const query = queryFrom((await props.searchParams)[SEARCH_PARAM])
  const terms = parseSearchTerms(query)

  let results: ReturnType<typeof toSearchResults> = []
  let failed = false
  if (terms.length > 0) {
    try {
      const {data} = await sanityFetch({
        query: searchQuery,
        params: {terms: searchPatterns(terms), limit: SEARCH_LIMIT + 1},
        // Plain strings: a results list is not an editing surface.
        stega: false,
      })
      results = toSearchResults(data, terms)
    } catch {
      failed = true
    }
  }
  const capped = results.length > SEARCH_LIMIT
  if (capped) results = results.slice(0, SEARCH_LIMIT)

  const searched = terms.length > 0
  const empty = searched && !failed && results.length === 0

  return (
    <section className="flex flex-col gap-12 bg-background py-s6 md:gap-16">
      <div className="tf-px">
        <div className="tf-max-w flex flex-col gap-12 md:gap-16">
          <div className="flex flex-col gap-10 md:gap-12">
            <h1 className="max-w-[24ch] break-words text-headline-xl leading-[1.1] tracking-tight text-on-background">
              {searched ? <>Results for &ldquo;{query}&rdquo;</> : 'Search'}
            </h1>
            {/* Keyed on the query so a new search resets the field to it, error state included. */}
            <SearchField
              key={query}
              defaultValue={query}
              error={failed ? 'Search is unavailable right now. Please try again.' : empty ? 'No search results' : undefined}
              className="max-w-3xl"
            />
          </div>

          {!searched && (
            <p className="max-w-[60ch] font-secondary text-body-large leading-[1.6] text-on-background-subtle">
              Search pages, news, projects, events, properties and public records.
            </p>
          )}
          {empty && (
            <p className="max-w-[60ch] font-secondary text-body-large leading-[1.6] text-on-background-subtle">
              Nothing matched every word. Check the spelling, or try fewer or more general words.
            </p>
          )}
        </div>
      </div>
      {/* Outside the padded block: the filter tabs carry their own page padding, as in the archives. */}
      {results.length > 0 && <SearchResults results={results} capped={capped} />}
    </section>
  )
}
