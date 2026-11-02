'use client'

import {useEffect, useRef} from 'react'

type Grecaptcha = {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: {action: string}) => Promise<string>
}
declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}

/** The action name sent with every form submission; the server checks it came back unchanged. */
export const RECAPTCHA_ACTION = 'form_submit'

let loading: Promise<void> | null = null

/**
 * Loads Google's script once, on demand, and resolves when `grecaptcha` exists. Calling it again
 * (another form, a submit) reuses the same load. A failed load (blocked by an extension or the
 * network) rejects and clears itself, so the next attempt can try again.
 */
function loadRecaptcha(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('reCAPTCHA failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Starts loading Google reCAPTCHA v3 when someone first touches the form this sits in, rather than
 * on every page load: the script is about 350 KB plus an iframe, and the newsletter form is in the
 * footer of every page. v3 has no widget in the form: the script adds Google's floating badge
 * (bottom right) once it loads, and a token is requested when the visitor submits, by
 * getRecaptchaToken, which loads the script itself if it is not there yet (autofill then Enter, say),
 * so the early load only saves time on submit. Mounting this on several forms is safe: there is one
 * load. Rendered only when a site key is configured.
 */
export default function Recaptcha({siteKey}: {siteKey: string}) {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const form = marker.current?.closest('form')
    if (!form) return
    const start = () => {
      // A failed load is reported on submit, where the visitor can act on it.
      loadRecaptcha(siteKey).catch(() => {})
    }
    const events = ['focusin', 'pointerdown', 'touchstart', 'keydown'] as const
    for (const name of events) form.addEventListener(name, start, {once: true, passive: true})
    return () => {
      for (const name of events) form.removeEventListener(name, start)
    }
  }, [siteKey])

  return <span ref={marker} hidden />
}

/**
 * A fresh single-use token for this submission. Loads the script first if the form was not touched
 * early. Rejects if it cannot load (blocked by an extension or the network) or is not ready, which
 * the form reports as a failed human check.
 */
export async function getRecaptchaToken(siteKey: string, action: string): Promise<string> {
  await loadRecaptcha(siteKey)
  const grecaptcha = window.grecaptcha
  if (!grecaptcha) throw new Error('reCAPTCHA not loaded')
  return new Promise((resolve, reject) => {
    grecaptcha.ready(() => grecaptcha.execute(siteKey, {action}).then(resolve, reject))
  })
}
