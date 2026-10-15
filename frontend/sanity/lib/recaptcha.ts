import 'server-only'

let warned = false

/** v3 returns a score from 0.0 (bot) to 1.0 (human); Google suggests 0.5 as the default cut-off. */
const MIN_SCORE = 0.5

/**
 * Verifies a reCAPTCHA v3 token: Google must accept it, the score must clear the threshold and the
 * action must be the one the form requested. With no secret configured (local development) it
 * passes, so the form still works; in production a missing secret is logged once because it leaves
 * only the honeypot and rate limit in place.
 */
export async function verifyRecaptcha(
  token: string | undefined,
  ip: string,
  action: string,
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && !warned) {
      warned = true
      console.warn('RECAPTCHA_SECRET_KEY is not set: form submissions are not captcha-checked.')
    }
    return true
  }
  if (!token) return false
  const body = new URLSearchParams({secret, response: token})
  if (ip !== 'unknown') body.set('remoteip', ip)
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body,
    })
    const result = (await response.json()) as {success?: boolean; score?: number; action?: string}
    return result.success === true && (result.score ?? 0) >= MIN_SCORE && result.action === action
  } catch {
    return false
  }
}
