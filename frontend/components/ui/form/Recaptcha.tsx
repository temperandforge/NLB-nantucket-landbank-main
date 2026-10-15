'use client'

import Script from 'next/script'

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

/**
 * Loads Google reCAPTCHA v3, rendered only when a site key is configured. v3 has no widget in the
 * form: the script adds Google's floating badge (bottom right) and a token is requested when the
 * visitor submits, by getRecaptchaToken. Mounting this on several forms is safe: Next loads one
 * script per src.
 */
export default function Recaptcha({siteKey}: {siteKey: string}) {
  return (
    <Script
      src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`}
      strategy="afterInteractive"
    />
  )
}

/**
 * A fresh single-use token for this submission. Rejects if the script has not loaded (blocked by
 * an extension or the network), which the form reports as a failed human check.
 */
export function getRecaptchaToken(siteKey: string, action: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const grecaptcha = window.grecaptcha
    if (!grecaptcha) return reject(new Error('reCAPTCHA not loaded'))
    grecaptcha.ready(() => grecaptcha.execute(siteKey, {action}).then(resolve, reject))
  })
}
