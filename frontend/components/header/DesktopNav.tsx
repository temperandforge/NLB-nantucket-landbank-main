'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useId, useRef, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavDropdown from './NavDropdown'
import NavSearch from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

/**
 * The desktop bar. Owns which dropdown is open: one at a time, closed by Escape (focus returns
 * to its trigger), by a click outside, or by opening another. While one is open the root carries
 * data-header-lock so HeaderShell keeps the header visible.
 */
export default function DesktopNav({menu}: {menu: HeaderMenuData}) {
  const baseId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  // The pathname the dropdown was opened on: once the route changes it no longer matches, so the
  // dropdown reads as closed without a setState-in-effect.
  const [opened, setOpened] = useState<{key: string; pathname: string} | null>(null)
  const openKey = opened && opened.pathname === pathname ? opened.key : null
  const setOpenKey = (key: string | null) => setOpened(key ? {key, pathname} : null)

  useEffect(() => {
    if (!openKey) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpened(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpened(null)
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${openKey}"]`)?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openKey])

  return (
    <div ref={rootRef} data-header-lock={openKey ? '' : undefined} className="flex items-center gap-gap-md max-lg:hidden">
      <nav aria-label="Primary">
        <ul className="flex items-center gap-gap-md">
          {menu.items.map((item) => {
            if (item._type === 'menuLink') {
              if (!resolveItemHref(item.link)) return null
              return (
                <li key={item._key}>
                  <ResolvedLink link={item.link} className="font-secondary text-body-small hover:underline">
                    {item.label}
                  </ResolvedLink>
                </li>
              )
            }

            const open = openKey === item._key
            const triggerId = `${baseId}-${item._key}-trigger`
            const panelId = `${baseId}-${item._key}-panel`
            const hasLinks = item.children.some((child) => resolveItemHref(child.link))
            if (!hasLinks) return null
            const grouped = item.children.some((child) => child.group?.trim())

            return (
              <li key={item._key} className={grouped ? 'static' : 'relative'}>
                <button
                  id={triggerId}
                  type="button"
                  data-nav-trigger={item._key}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : item._key)}
                  className={`inline-flex items-center gap-gap-mini font-secondary text-body-small ${
                    open ? 'border-b border-border-dark text-on-background' : 'text-on-background-subtle'
                  }`}
                >
                  {item.label}
                  {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                </button>
                {open && <NavDropdown onNavigate={() => setOpenKey(null)} id={panelId} labelledBy={triggerId} items={item.children} />}
              </li>
            )
          })}
        </ul>
      </nav>
      <NavSearch variant="desktop" />
    </div>
  )
}
