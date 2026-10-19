'use client'

import {useState, useSyncExternalStore} from 'react'

import {CloseIcon} from '@/components/icons'
import ResolvedLink from '@/components/ResolvedLink'
import type {SiteBannerData} from '@/sanity/lib/types'

import {bannerKey, readDismissed, writeDismissed} from './bannerDismissal'

const subscribeNever = () => () => {}

/**
 * The dismissible bar above the header. Server-rendered visible, so first-time visitors get no
 * layout shift. A tiny inline script right after the bar hides it before first paint when this
 * visitor already dismissed this exact message (the server can't read localStorage), so returning
 * visitors don't see a flash; hydration then removes it from the tree.
 */
export default function SiteBanner({banner}: {banner: SiteBannerData}) {
  const message = banner.message?.trim()
  const key = message ? bannerKey(message) : null
  const [dismissedNow, setDismissedNow] = useState(false)
  // Server snapshot is always "not dismissed"; the client snapshot reads storage after hydration.
  const dismissedBefore = useSyncExternalStore(
    subscribeNever,
    () => (key ? readDismissed(key) : false),
    () => false,
  )

  if (!message || !key || dismissedNow || dismissedBefore) return null

  const text = <span className="font-secondary text-body-base leading-[1.6] opacity-80">{message}</span>

  const hideIfDismissed = `try{if(localStorage.getItem(${JSON.stringify(key)})==='1')document.currentScript.previousElementSibling.style.display='none'}catch(e){}`

  return (
    <>
      {/* 34px minimum per Figma (59:20); a longer message wraps and grows the bar. The side padding
          clears the close button, which is pinned to the right. The inline style the script may add
          differs from the server markup, hence suppressHydrationWarning. */}
      <div
        suppressHydrationWarning
        data-site-banner
        className="relative flex min-h-[34px] items-center justify-center bg-lowlands-500 px-14 py-1 text-on-accent-secondary"
      >
        {banner.link ? (
          <ResolvedLink link={banner.link} className="underline-offset-4 hover:underline">
            {text}
          </ResolvedLink>
        ) : (
          text
        )}
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => {
            writeDismissed(key)
            setDismissedNow(true)
          }}
          // p-1 makes the hit area 28px (WCAG 2.5.8); right-4 / md:right-9 keep the 20px icon 20px (mobile) / 40px (desktop) from the edge, per Figma 293:344 / 59:20.
          className="absolute right-4 md:right-9 top-1/2 -translate-y-1/2 p-1"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      <script dangerouslySetInnerHTML={{__html: hideIfDismissed}} />
    </>
  )
}
