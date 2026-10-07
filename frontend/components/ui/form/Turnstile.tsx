'use client'

import Script from 'next/script'
import {useCallback, useEffect, useRef} from 'react'

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/**
 * Cloudflare Turnstile. Rendered only when a site key is configured. The widget is a labelled
 * iframe in the normal tab order. `resetKey` changes after a rejected submit so a fresh token is
 * issued, because a token is single-use.
 */
export default function Turnstile({
  siteKey,
  resetKey,
  onToken,
}: {
  siteKey: string
  resetKey: number
  onToken: (token: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)

  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widget.current) return
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    })
  }, [siteKey, onToken])

  useEffect(() => {
    render()
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = undefined
    }
  }, [render])

  useEffect(() => {
    if (resetKey > 0 && widget.current) window.turnstile?.reset(widget.current)
  }, [resetKey])

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
      />
      <div ref={container} />
    </>
  )
}
