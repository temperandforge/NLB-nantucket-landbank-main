'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useId, useRef, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavDropdown from './NavDropdown'
import NavSearch, {NAV_SEARCH_KEY} from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

// Shared by plain links and submenu triggers so the two read as one set. Items fill the bar's height so an open
// submenu's rule (border-b) sits on the bar's bottom edge, as in Figma; hover only darkens the text.
const ITEM_CLASS =
  'inline-flex items-center gap-gap-mini self-stretch border-b px-2 font-secondary text-body-base whitespace-nowrap'
const ITEM_IDLE = 'border-transparent text-on-background-subtle hover:text-accent-primary'
const ITEM_OPEN = 'border-border-dark text-accent-primary'

/**
 * The desktop bar. Owns which dropdown (or the search panel) is open: one at a time, closed by Escape (focus returns
 * to its trigger), by a click outside, or by opening another. While one is open the root carries
 * data-header-lock so HeaderShell keeps the header visible.
 */
export default function DesktopNav({menu}: {menu: HeaderMenuData}) {
  const baseId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [openKey, setOpenKey] = useState<string | null>(null)
  // Reset during render when the route changes (not an effect), so a navigation by any means
  // closes the dropdown and a later return to the same path cannot reopen it.
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setOpenKey(null)
  }

  useEffect(() => {
    if (!openKey) return
    // Below xl this bar is display:none; a dropdown left open would keep data-header-lock on a hidden element.
    const desktop = window.matchMedia('(min-width: 80rem)')
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpenKey(null)
    }
    desktop.addEventListener('change', onChange)
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenKey(null)
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${openKey}"]`)?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onChange)
    }
  }, [openKey])

  return (
    <div
      ref={rootRef}
      data-header-lock={openKey ? '' : undefined}
      // Tabbing out of the bar closes the dropdown so it cannot cover the next focused element. A null
      // relatedTarget (a click on non-focusable panel area, or the window losing focus) is ignored.
      onBlur={(event) => {
        if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) setOpenKey(null)
      }}
      // Stretches to the full bar height so each <li> (and a flat panel's top-full) reaches the bar's bottom edge.
      className="flex items-stretch self-stretch gap-8 max-xl:hidden"
    >
      <nav aria-label="Primary" className="flex">
        <ul className="flex items-stretch gap-6">
          {(menu.items ?? []).map((item) => {
            if (!item) return null
            if (item._type === 'menuLink') {
              if (!resolveItemHref(item.link)) return null
              return (
                <li key={item._key} className="flex items-stretch">
                  <ResolvedLink link={item.link} className={`${ITEM_CLASS} ${ITEM_IDLE}`}>
                    {item.label}
                  </ResolvedLink>
                </li>
              )
            }

            const open = openKey === item._key
            const triggerId = `${baseId}-${item._key}-trigger`
            const panelId = `${baseId}-${item._key}-panel`
            // children is typed non-null but the API does not enforce it: a freshly added submenu has none.
            const live = (item.children ?? []).filter((child) => resolveItemHref(child.link))
            if (live.length === 0) return null
            // One value, from the resolvable links only, for both the <li> position and the panel layout.
            const grouped = live.some((child) => child.group?.trim())

            return (
              <li key={item._key} className={`flex items-stretch ${grouped ? 'static' : 'relative'}`}>
                <button
                  id={triggerId}
                  type="button"
                  data-nav-trigger={item._key}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : item._key)}
                  className={`${ITEM_CLASS} ${open ? ITEM_OPEN : ITEM_IDLE}`}
                >
                  {item.label}
                  {open ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                </button>
                {open && (
                  <NavDropdown
                    onNavigate={() => setOpenKey(null)}
                    id={panelId}
                    labelledBy={triggerId}
                    items={live}
                    grouped={grouped}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <NavSearch
        variant="desktop"
        open={openKey === NAV_SEARCH_KEY}
        onToggle={() => setOpenKey(openKey === NAV_SEARCH_KEY ? null : NAV_SEARCH_KEY)}
        onSearch={() => setOpenKey(null)}
        panelId={`${baseId}-search-panel`}
        className="self-center"
      />
    </div>
  )
}
