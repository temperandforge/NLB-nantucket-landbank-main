import {SearchIcon} from '@/components/icons'
import SearchField from '@/components/search/SearchField'

/**
 * Site search in the header (Figma: Nav search). Submitting goes to /search, which does the work.
 *
 * Desktop is a yellow square toggle at the end of the bar; the field itself opens in a full-width
 * panel under the bar. DesktopNav owns whether it is open (one panel at a time with the menu
 * dropdowns), which is also what closes it on Escape, an outside click or a route change, and what
 * keeps the header on screen while it is open. Mobile is the field inside the menu panel, on the
 * input surface.
 */

/** The key DesktopNav files the search panel under, beside the menu items' own keys. */
export const NAV_SEARCH_KEY = 'search'

type DesktopProps = {
  variant: 'desktop'
  open: boolean
  onToggle: () => void
  /** Called after a search is submitted, so the panel can close. */
  onSearch: () => void
  panelId: string
  className?: string
}

type MobileProps = {
  variant: 'mobile'
  /** The query to show: the results page's own, so the menu field and the page agree. Empty elsewhere. */
  query: string
  /** Called after a search is submitted, so the menu can close. */
  onSearch: () => void
  className?: string
}

export default function NavSearch(props: DesktopProps | MobileProps) {
  if (props.variant === 'mobile') {
    return (
      <div className={`rounded bg-input px-gap-md py-4 text-on-background ${props.className ?? ''}`}>
        {/* Keyed on the query: the menu stays mounted, so the field is reset whenever the owner hands it a new one. */}
        <SearchField key={props.query} defaultValue={props.query} onSearch={props.onSearch} />
      </div>
    )
  }

  const {open, onToggle, onSearch, panelId, className} = props
  return (
    <>
      <button
        type="button"
        data-nav-trigger={NAV_SEARCH_KEY}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close search' : 'Open search'}
        onClick={onToggle}
        className={`icon-button icon-button-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 ${className ?? ''}`}
      >
        <SearchIcon className="size-6" />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Search"
          // Full-bleed: `fixed` resolves against the header (its translate is the containing block), so
          // the panel spans the header's full width, just under it, with no overflow to clip. The field is
          // inset to line up with the bar's content.
          // The shadow's blur reaches 60px above the panel, over the header bar it is part of, so the
          // panel is clipped to its own top edge and sides and left open below, where the shadow falls.
          className="fixed inset-x-0 top-full z-40 animate-nav-panel-in motion-reduce:animate-none bg-background py-gap-lg shadow-[0_20px_80px_rgba(47,42,34,0.16)] [clip-path:inset(0_0_-120px_0)]"
        >
          <div className="tf-px">
            <div className="tf-max-w">
              <SearchField autoFocus onSearch={onSearch} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
