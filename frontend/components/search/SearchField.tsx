'use client'

import {useRouter} from 'next/navigation'
import {useId, useRef, useState, type FormEvent} from 'react'

import {ArrowRightIcon} from '@/components/icons'
import {SEARCH_PARAM, cleanQuery} from '@/sanity/lib/search'

/**
 * The site search field (Figma: Nav search): a tracked "Search" label over the input, an arrow
 * button at the right, and a rule underneath. The same field serves the header's desktop panel,
 * the mobile menu and the results page; the container around it (panel, card or page) is the
 * caller's.
 *
 * States, all from the design: empty (placeholder, bare arrow), typing (the arrow button takes the
 * yellow square) and error (the message in red beneath the rule). It is a plain GET form to
 * /search, so it works before the page has hydrated; once it has, the submit navigates in-app.
 * An empty query does nothing but return focus to the input.
 */
export default function SearchField({
  defaultValue = '',
  error,
  autoFocus = false,
  onSearch,
  className,
}: {
  defaultValue?: string
  /** Shown in red beneath the rule and tied to the input as its description. */
  error?: string
  autoFocus?: boolean
  /** Called when a search is submitted, so the owner can close its panel. */
  onSearch?: () => void
  className?: string
}) {
  const router = useRouter()
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const typing = value.trim().length > 0

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = cleanQuery(value)
    if (!query) {
      inputRef.current?.focus()
      return
    }
    router.push(`/search?${SEARCH_PARAM}=${encodeURIComponent(query)}`)
    onSearch?.()
  }

  return (
    <form role="search" action="/search" method="get" onSubmit={submit} className={`flex flex-col gap-gap-sm ${className ?? ''}`}>
      <div className="flex items-end justify-between gap-gap-sm">
        <div className="flex min-w-0 grow flex-col gap-gap-sm">
          <label htmlFor={inputId} className="font-mono-tracked text-body-small uppercase tracking-[1.54px] leading-[1.6]">
            Search
          </label>
          <input
            ref={inputRef}
            id={inputId}
            name={SEARCH_PARAM}
            type="search"
            // autoFocus is for a panel the visitor just opened; the field itself never steals focus on load.
            autoFocus={autoFocus}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={100}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search here..."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-8 w-full min-w-0 bg-transparent font-secondary text-body-large leading-[1.6] text-on-background outline-none placeholder:text-on-input-placeholder [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
        <button
          type="submit"
          aria-label="Search"
          className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded text-on-background transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 ${
            typing ? 'bg-secondary' : 'bg-transparent hover:bg-secondary/40'
          }`}
        >
          <ArrowRightIcon className="size-6" />
        </button>
      </div>
      <div className="h-px w-full bg-border-light" />
      {error && (
        <p id={errorId} role="alert" className="font-secondary text-body-small leading-[1.6] text-error">
          {error}
        </p>
      )}
    </form>
  )
}
