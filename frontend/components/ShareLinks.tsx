'use client'

import {useState} from 'react'

import {FacebookIcon, LinkAltIcon, LinkedInIcon} from '@/components/icons'
import {shareUrl, type ShareNetwork} from '@/sanity/lib/share'

// 40px targets at 8px apart keep the row's 48px pitch (it was 32px at 16px) while giving the hover
// surface room around the 24 to 29px icons. Hover takes the darker surface, like the site's rows
// and cards, and press shrinks the button a little. Tailwind applies `hover` only where the device
// can hover, so a tap never leaves one stuck. Motion is dropped under reduced motion, leaving the
// instant colour change.
const BUTTON =
  'flex size-10 cursor-pointer items-center justify-center rounded text-on-background transition-[background-color,scale] duration-200 hover:bg-surface-dark active:scale-90 active:bg-surface-dark motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:bg-surface-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500'

/**
 * The Share row (Figma: Share, with link, Facebook and LinkedIn). Instagram has no web share
 * address, so it is left out. Everything reads the current address in the browser when clicked, so
 * nothing is computed on the server and no site URL setting is needed.
 */
export default function ShareLinks({label = 'Share'}: {label?: string}) {
  const [status, setStatus] = useState('')

  function share(network: ShareNetwork) {
    const url = shareUrl(network, window.location.href)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('Link copied')
    } catch {
      // No clipboard (an insecure context) or the browser refused.
      setStatus('Could not copy the link')
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-center font-mono text-body-base leading-[1.6] text-on-background">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={copy} aria-label="Copy link" className={BUTTON}>
          <LinkAltIcon className="size-6" />
        </button>
        <button type="button" onClick={() => share('facebook')} aria-label="Share on Facebook" className={BUTTON}>
          <FacebookIcon className="size-[29px]" />
        </button>
        <button type="button" onClick={() => share('linkedin')} aria-label="Share on LinkedIn" className={BUTTON}>
          <LinkedInIcon className="size-[29px]" />
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={status ? 'font-sans text-body-small text-on-background-subtle' : 'sr-only'}
      >
        {status}
      </p>
    </div>
  )
}
