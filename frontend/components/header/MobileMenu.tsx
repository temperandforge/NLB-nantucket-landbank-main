'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useId, useRef, useState} from 'react'

import ResolvedLink from '@/components/ResolvedLink'
import {ArrowLeftIcon, ChevronDownIcon, MenuToggleIcon} from '@/components/icons'
import {groupMenuLinks} from '@/sanity/lib/menuGroups'
import {SEARCH_PARAM, cleanQuery} from '@/sanity/lib/search'
import type {HeaderMenuData} from '@/sanity/lib/types'

import NavSearch from './NavSearch'
import {resolveItemHref} from './resolveItemHref'

const LABEL_CLASS = 'font-mono-tracked text-[12px] uppercase tracking-[1.32px] leading-[1.6]'

/**
 * Hamburger plus a full-height panel under the bar. A top-level submenu drills into a
 * sub-panel with a Back link; plain links navigate directly. Body scroll is locked while open.
 * Closing the panel (toggle, Escape, following a link, or any route change) closes it; the drill-in
 * resets on the next open, so the panel keeps its content while it fades out.
 *
 * The panel stays mounted so it can animate out: closed it is `invisible` and `inert` (out of the tab
 * order and the accessibility tree). Opening fades and slides it in and staggers the items; a
 * drill-in or Back slides the new view in from the side. All motion is off under reduced motion.
 */
export default function MobileMenu({menu}: {menu: HeaderMenuData}) {
  const panelId = useId()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [drilledKey, setDrilledKey] = useState<string | null>(null)
  // Which way the last drill swap went, so the incoming view slides from the right side. Null on open.
  const [swap, setSwap] = useState<'forward' | 'back' | null>(null)
  // Where the bar's bottom edge was when the panel opened (see the toggle's click handler).
  const [barBottom, setBarBottom] = useState<number | null>(null)
  // The results page's query, read from the address each time the panel opens (not with
  // useSearchParams, whose Suspense boundary in a site-wide header may never swap in on a hard load).
  const [searchQuery, setSearchQuery] = useState('')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastDrilled = useRef<string | null>(null)
  // Reset during render when the route changes (React-sanctioned, not an effect), so a navigation
  // by any means closes the panel and a later return to the same path cannot reopen it.
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setOpen(false)
    setDrilledKey(null)
    setSwap(null)
  }

  const close = () => {
    setOpen(false)
  }

  const drill = (key: string | null) => {
    setSwap(key ? 'forward' : 'back')
    setDrilledKey(key)
  }

  // Drill-in and Back unmount the focused button, so hand focus on explicitly: the sub-panel
  // heading going in, the originating top-level button coming back.
  useEffect(() => {
    const previous = lastDrilled.current
    lastDrilled.current = drilledKey
    if (!open) return
    if (drilledKey) headingRef.current?.focus()
    else if (previous) {
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-drill]') ?? []
      Array.from(buttons)
        .find((button) => button.dataset.drill === previous)
        ?.focus()
    }
  }, [drilledKey, open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      toggleRef.current?.focus()
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

  // Root-level items rise in one after another on open; closing drops the delay so they leave together.
  const stagger = (index: number) => ({
    className: `transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
      open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
    }`,
    style: {transitionDelay: open ? `${80 + index * 45}ms` : '0ms'},
  })

  const items = menu.items ?? []
  const drilled = items.find((item) => item._key === drilledKey)

  return (
    <div data-header-lock={open ? '' : undefined} className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={(event) => {
          if (open) {
            close()
            toggleRef.current?.focus()
          } else {
            // The banner sits above the bar until scrolled away and body scroll locks on open, so the
            // bar's bottom edge is not always --header-height. Measure it once now and size the panel
            // to end at the viewport bottom (position:fixed would not work: the shell's translate is
            // the containing block).
            const bar = event.currentTarget.closest('[data-header-bar]')
            setBarBottom(bar ? bar.getBoundingClientRect().bottom : null)
            setDrilledKey(null)
            setSwap(null)
            setSearchQuery(
              window.location.pathname === '/search'
                ? cleanQuery(new URLSearchParams(window.location.search).get(SEARCH_PARAM))
                : '',
            )
            setOpen(true)
          }
        }}
        className="flex size-10 items-center justify-center"
      >
        <MenuToggleIcon open={open} className="size-6" />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        inert={!open}
        style={barBottom === null ? undefined : {height: `calc(100dvh - ${barBottom}px)`}}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) close()
        }}
        // Positioned against the header bar container (a `relative` ancestor); height uses --header-height.
        // The container sits inside the header's page gutters, so break out to the viewport edges:
        // centre on the container and take the full viewport width (body scroll is locked, so no scrollbar skews it).
        className={`absolute left-1/2 top-full z-40 flex h-[calc(100dvh-var(--header-height))] w-screen -translate-x-1/2 flex-col bg-background tf-px py-gap-md transition-[opacity,translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0'
        }`}
      >
        {drilled && drilled._type === 'menuGroup' ? (
          <nav
            key={drilled._key}
            aria-label="Primary"
            className={`flex grow flex-col ${swap ? 'mobile-menu-view' : ''}`}
            style={{'--mobile-menu-slide-from': '1.5rem'} as React.CSSProperties}
          >
            <div className="flex grow flex-col gap-gap-md overflow-y-auto">
              <h2 ref={headingRef} tabIndex={-1} className={`${LABEL_CLASS} outline-none`}>
                {drilled.label}
              </h2>
              {groupMenuLinks(
                (drilled.children ?? []).filter((child) => resolveItemHref(child.link)),
              ).map((column, index) => (
                <div
                  key={`${column.heading ?? 'none'}-${index}`}
                  className="flex flex-col gap-gap-sm"
                >
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
              ))}
            </div>
            <button
              type="button"
              onClick={() => drill(null)}
              className="mt-gap-md inline-flex items-center gap-gap-sm self-start font-secondary text-body-small"
            >
              <ArrowLeftIcon className="size-5" />
              Back
            </button>
          </nav>
        ) : (
          <nav
            key="root"
            aria-label="Primary"
            className={`flex grow flex-col ${swap ? 'mobile-menu-view' : ''}`}
            style={{'--mobile-menu-slide-from': '-1.5rem'} as React.CSSProperties}
          >
            <ul className="flex grow flex-col gap-gap-md overflow-y-auto">
              {items.map((item, index) => {
                if (!item) return null
                if (item._type === 'menuLink') {
                  if (!resolveItemHref(item.link)) return null
                  return (
                    <li key={item._key} {...stagger(index)}>
                      <ResolvedLink link={item.link} className="font-secondary text-body-base">
                        {item.label}
                      </ResolvedLink>
                    </li>
                  )
                }
                if (!(item.children ?? []).some((child) => resolveItemHref(child.link))) return null
                return (
                  <li key={item._key} {...stagger(index)}>
                    <button
                      type="button"
                      data-drill={item._key}
                      onClick={() => drill(item._key)}
                      className="inline-flex items-center gap-gap-sm font-secondary text-body-base"
                    >
                      {item.label}
                      <ChevronDownIcon className="size-4 -rotate-90" />
                    </button>
                  </li>
                )
              })}
            </ul>
            <NavSearch variant="mobile" query={searchQuery} onSearch={close} className="mt-gap-md" />
          </nav>
        )}
      </div>
    </div>
  )
}
