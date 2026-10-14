import 'server-only'

let warned = false

/**
 * Verifies a Turnstile token. With no secret configured (local development) it passes, so the
 * form still works; in production a missing secret is logged once because it leaves only the
 * honeypot and rate limit in place.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && !warned) {
      warned = true
      console.warn('TURNSTILE_SECRET_KEY is not set: form submissions are not captcha-checked.')
    }
    return true
  }
  if (!token) return false
  const body = new URLSearchParams({secret, response: token})
  if (ip !== 'unknown') body.set('remoteip', ip)
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    const result = (await response.json()) as {success?: boolean}
    return result.success === true
  } catch {
    return false
  }
}
