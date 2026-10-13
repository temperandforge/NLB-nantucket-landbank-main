'use client'

import FilterTabs from '@/components/ui/FilterTabs'
import {ArrowRightIcon, DownloadIcon} from '@/components/icons'
import {
  SEARCH_FILTER_LABEL,
  SEARCH_TYPE_PARAM,
  filterByType,
  searchTabs,
  type SearchResult,
  type TextRun,
} from '@/sanity/lib/search'
import {useQueryFilter} from '@/components/blocks/useQueryFilter'

/** Text with the searched-for parts marked: underlined in the accent yellow, the colour left alone. */
function Runs({runs}: {runs: TextRun[]}) {
  return (
    <>
      {runs.map((run, index) =>
        run.match ? (
          <mark
            key={index}
            className="bg-transparent text-inherit underline decoration-border-alt decoration-2 underline-offset-4"
          >
            {run.text}
          </mark>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </>
  )
}

/**
 * One result: what kind of thing it is (and its date), its title, an excerpt around where the
 * words were found, and an arrow, or the download tray for a record. The whole row is the link and
 * takes the darker surface on hover and focus, like a record row.
 */
function ResultRow({result}: {result: SearchResult}) {
  return (
    <li className="border-t border-border-light last:border-b">
      <a
        href={result.href}
        download={result.download ? '' : undefined}
        target={result.external && !result.download ? '_blank' : undefined}
        rel={result.external && !result.download ? 'noopener noreferrer' : undefined}
        className="group grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-3 bg-background py-8 text-on-background no-underline transition-[padding,background-color] hover:bg-surface-dark hover:px-3 focus-visible:bg-surface-dark focus-visible:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 md:grid-cols-[9rem_1fr_auto] md:gap-x-10"
      >
        <p className="col-span-2 font-mono-tracked text-body-small uppercase tracking-[1.54px] leading-[1.6] text-on-background-subtle md:col-span-1 md:pt-2">
          {result.typeLabel}
          {result.date && <span className="block normal-case tracking-normal">{result.date}</span>}
        </p>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="break-words text-headline-sm leading-[1.2] tracking-normal">
            <Runs runs={result.title} />
          </h2>
          {result.snippet.length > 0 && (
            <p className="font-secondary text-body-base leading-[1.6] text-on-background-subtle">
              <Runs runs={result.snippet} />
            </p>
          )}
        </div>
        {result.download ? (
          <DownloadIcon className="mt-1 size-6 shrink-0 text-border-light group-hover:text-on-surface-dark group-focus-visible:text-on-surface-dark" />
        ) : (
          <ArrowRightIcon className="mt-1 size-6 shrink-0 text-border-light group-hover:text-secondary group-focus-visible:text-secondary" />
        )}
      </a>
    </li>
  )
}

/**
 * The results with a row of tabs by kind (pages, news, projects ...) when more than one kind
 * was found. The chosen kind is ?type=<kind> in the address, like every archive filter, and the
 * count under the tabs is announced when it changes.
 */
export default function SearchResults({results, capped}: {results: SearchResult[]; capped: boolean}) {
  const tabs = searchTabs(results)
  const {active, choose} = useQueryFilter(SEARCH_TYPE_PARAM, tabs)
  const shown = filterByType(results, active)

  return (
    <div className="flex w-full flex-col gap-10">
      {tabs.length > 1 && <FilterTabs tabs={tabs} active={active} label={SEARCH_FILTER_LABEL} onChoose={choose} />}
      <div className="tf-px">
       <div className="tf-max-w flex flex-col gap-6">
        <p
          role="status"
          className="font-mono-tracked text-body-small uppercase tracking-[1.54px] leading-[1.6] text-on-background-subtle"
        >
          {shown.length} {shown.length === 1 ? 'result' : 'results'}
          {capped && !active ? ' (first ' + results.length + ')' : ''}
        </p>
        <ol className="flex flex-col">
          {shown.map((result) => (
            <ResultRow key={result.id} result={result} />
          ))}
        </ol>
        {capped && !active && (
          <p className="font-secondary text-body-base text-on-background-subtle">
            There are more matches than are listed here. Add a word to narrow the search.
          </p>
        )}
       </div>
      </div>
    </div>
  )
}
