'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useId, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ArrowLeftIcon, ChevronDownIcon, CloseIcon, MenuIcon} from '@/components/icons'
import {groupMenuLinks} from '@/sanity/lib/menuGroups'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavSearch from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

/**
 * Hamburger plus a full-height panel under the bar. A top-level submenu drills into a
 * sub-panel with a Back link; plain links navigate directly. Body scroll is locked while open.
 * Closing the panel (toggle, Escape, following a link, or any route change) resets the drill-in.
 */
export default function MobileMenu({menu}: {menu: HeaderMenuData}) {
  const panelId = useId()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [drilledKey, setDrilledKey] = useState<string | null>(null)
  // Reset during render when the route changes (React-sanctioned, not an effect), so a navigation
  // by any means closes the panel and a later return to the same path cannot reopen it.
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setOpen(false)
    setDrilledKey(null)
  }

  const close = () => {
    setOpen(false)
    setDrilledKey(null)
  }

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    // Tailwind lg (64rem): the menu is hidden at and above it, so release the lock there.
    const desktop = window.matchMedia('(min-width: 64rem)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) close()
    }
    document.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onChange)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onChange)
    }
  }, [open])

  const drilled = open ? menu.items.find((item) => item._key === drilledKey) : undefined

  return (
    <div data-header-lock={open ? '' : undefined} className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => {
          if (open) close()
          else {
            setDrilledKey(null)
            setOpen(true)
          }
        }}
        className="flex size-10 items-center justify-center"
      >
        {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>

      {open && (
        <div
          id={panelId}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) close()
          }}
          // Positioned against the header bar container (a `relative` ancestor); height uses --header-height.
          className="absolute inset-x-0 top-full z-40 flex h-[calc(100dvh-var(--header-height))] flex-col bg-background px-gap-md py-gap-md"
        >
          {drilled && drilled._type === 'menuGroup' ? (
            <div className="flex grow flex-col">
              <div className="flex grow flex-col gap-gap-md overflow-y-auto">
                <h2 className={LABEL_CLASS}>{drilled.label}</h2>
                {groupMenuLinks(drilled.children.filter((child) => resolveItemHref(child.link))).map(
                  (column, index) => (
                    <div key={`${column.heading ?? 'none'}-${index}`} className="flex flex-col gap-gap-sm">
                      {column.heading && <h3 className={LABEL_CLASS}>{column.heading}</h3>}
                      <ul className="flex flex-col gap-gap-sm">
                        {column.links.map((child) => (
                          <li key={child._key}>
                            <ResolvedLink link={child.link} className="font-secondary text-body-base">
                              {child.label}
                            </ResolvedLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => setDrilledKey(null)}
                className="mt-gap-md inline-flex items-center gap-gap-sm self-start font-secondary text-body-small"
              >
                <ArrowLeftIcon className="size-5" />
                Back
              </button>
            </div>
          ) : (
            <div className="flex grow flex-col">
              <ul className="flex grow flex-col gap-gap-md overflow-y-auto">
                {menu.items.map((item) => {
                  if (item._type === 'menuLink') {
                    if (!resolveItemHref(item.link)) return null
                    return (
                      <li key={item._key}>
                        <ResolvedLink link={item.link} className="font-secondary text-body-base">
                          {item.label}
                        </ResolvedLink>
                      </li>
                    )
                  }
                  if (!item.children.some((child) => resolveItemHref(child.link))) return null
                  return (
                    <li key={item._key}>
                      <button
                        type="button"
                        onClick={() => setDrilledKey(item._key)}
                        className="inline-flex items-center gap-gap-sm font-secondary text-body-base"
                      >
                        {item.label}
                        <ChevronDownIcon className="size-4 -rotate-90" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <NavSearch variant="mobile" className="mt-gap-md" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
