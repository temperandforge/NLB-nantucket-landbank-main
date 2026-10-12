import {ArrowRightIcon, SearchIcon} from '@/components/icons'

/**
 * Site search - UI only. Search itself (a results page and the "No search results" state) is
 * deferred, so every control is disabled and nothing submits. See the spec's deferred section.
 *
 * TODO: wire to site search once it exists - see
 * https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/29 and
 * docs/superpowers/specs/2026-10-07-site-navigation-design.md
 */

type Props = {
  className?: string
  variant?: 'desktop' | 'mobile'
}

/** Tracked uppercase label - Figma type style mono/tracked. */
const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

export default function NavSearch({className, variant = 'desktop'}: Props) {
  if (variant === 'desktop') {
    return (
      <button
        type="button"
        disabled
        aria-label="Search (coming soon)"
        className={`flex size-12 items-center justify-center bg-secondary text-on-secondary disabled:cursor-not-allowed ${className ?? ''}`}
      >
        <SearchIcon className="size-6" />
      </button>
    )
  }

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className={`flex flex-col gap-gap-mini bg-input p-gap-sm ${className ?? ''}`}
    >
      <label htmlFor="nav-search-mobile" className={LABEL_CLASS}>
        Search
      </label>
      <div className="flex items-center gap-gap-sm border-b border-border-light">
        <input
          id="nav-search-mobile"
          type="search"
          disabled
          placeholder="Search here..."
          className="min-w-0 grow bg-transparent py-gap-mini font-secondary text-body-base placeholder:text-on-input-placeholder disabled:cursor-not-allowed"
        />
        <button type="submit" disabled aria-label="Search (coming soon)" className="disabled:cursor-not-allowed">
          <ArrowRightIcon className="size-6" />
        </button>
      </div>
    </form>
  )
}
