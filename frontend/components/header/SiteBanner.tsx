'use client'

import {useState, useSyncExternalStore} from 'react'

import {CloseIcon} from '@/components/icons'
import ResolvedLink from '@/components/ResolvedLink'
import type {SiteBannerData} from '@/sanity/lib/types'

import {bannerKey, readDismissed, writeDismissed} from './bannerDismissal'

const subscribeNever = () => () => {}

/**
 * The dismissible bar above the header. Server-rendered visible, then hidden after hydration
 * if this visitor already dismissed this exact message - which avoids a layout shift for
 * first-time visitors at the cost of a brief flash for returning ones.
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

  const text = <span className="font-secondary text-body-small">{message}</span>

  return (
    // 34px high per Figma (59:20)
    <div className="relative flex h-[34px] items-center justify-center bg-lowlands-500 px-gap-lg text-on-accent-secondary">
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
        className="absolute right-gap-md top-1/2 -translate-y-1/2"
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  )
}
