'use client'

import {useEffect, useState} from 'react'

import {FacebookIcon, InstagramIcon, LinkAltIcon, LinkedInIcon} from '@/components/icons'
import {shareUrl, type ShareNetwork} from '@/sanity/lib/share'

// 40px targets at 8px apart keep the row's 48px pitch (it was 32px at 16px). Hover and focus recolour
// the icon to the theme green (`accent-secondary`, 7.2:1 on the page; the yellow was 1.65:1), and press shrinks the button a little.
// Tailwind applies `hover` only where the device can hover, so a tap never leaves one stuck. Motion
// is dropped under reduced motion, leaving the instant colour change.
const BUTTON =
  'flex size-10 cursor-pointer items-center justify-center rounded text-on-background transition-[color,scale] duration-200 hover:text-accent-secondary active:scale-90 active:text-accent-secondary motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:text-accent-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500'

type Target = 'copy' | 'instagram'

const INSTAGRAM_URL = 'https://www.instagram.com/'

// How long the copy confirmation stays up.
const STATUS_MS = 2000

/**
 * The Share row (Figma: Share, with link, Facebook, Instagram and LinkedIn). Instagram has no web
 * share address, so its button copies the link and opens Instagram. Everything reads the current address in the browser when clicked, so
 * nothing is computed on the server and no site URL setting is needed.
 */
export default function ShareLinks({label = 'Share'}: {label?: string}) {
  // `text` is kept after the tooltip closes so it can fade out with its words; `n` restarts the
  // timer when the button is pressed again while the tooltip is still up.
  const [tip, setTip] = useState<{text: string; open: boolean; n: number; target: Target}>({
    text: '',
    open: false,
    n: 0,
    target: 'copy',
  })

  useEffect(() => {
    if (!tip.open) return
    const timer = setTimeout(() => setTip((t) => ({...t, open: false})), STATUS_MS)
    return () => clearTimeout(timer)
  }, [tip.open, tip.n])

  function share(network: ShareNetwork) {
    const url = shareUrl(network, window.location.href)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copyLink(target: Target, done: string) {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setTip((t) => ({text: done, open: true, n: t.n + 1, target}))
    } catch {
      // No clipboard (an insecure context) or the browser refused.
      setTip((t) => ({text: 'Could not copy the link', open: true, n: t.n + 1, target}))
    }
  }

  const copy = () => copyLink('copy', 'Link copied')

  // Instagram has no web share address, so the visitor pastes the link themselves. The tab opens
  // first, inside the click, because a window opened after an await can be blocked as a popup.
  function instagram() {
    window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
    void copyLink('instagram', 'Link copied. Paste it into Instagram.')
  }

  // One tooltip per button that confirms something, always mounted so it can transition. It rises a
  // few pixels as it fades in and settles back as it fades out; reduced motion keeps the fade and
  // drops the movement. The screen-reader copy is separate because the visible one is aria-hidden.
  function renderTip(target: Target) {
    const mine = tip.target === target
    const open = mine && tip.open
    return (
      <>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-on-background px-2 py-1 font-sans text-body-small leading-[1.4] text-background transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-opacity ${
            open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0 motion-reduce:translate-y-0'
          }`}
        >
          {mine ? tip.text : ''}
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {open ? tip.text : ''}
        </span>
      </>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-center font-mono text-body-base leading-[1.6] text-on-background">{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button type="button" onClick={copy} aria-label="Copy link" className={BUTTON}>
            <LinkAltIcon className="size-[29px]" />
          </button>
          {renderTip('copy')}
        </div>
        <button type="button" onClick={() => share('facebook')} aria-label="Share on Facebook" className={BUTTON}>
          <FacebookIcon className="size-[29px]" />
        </button>
        <div className="relative">
          <button type="button" onClick={instagram} aria-label="Share on Instagram: copies the link and opens Instagram" className={BUTTON}>
            <InstagramIcon className="size-[29px]" />
          </button>
          {renderTip('instagram')}
        </div>
        <button type="button" onClick={() => share('linkedin')} aria-label="Share on LinkedIn" className={BUTTON}>
          <LinkedInIcon className="size-[29px]" />
        </button>
      </div>
    </div>
  )
}
