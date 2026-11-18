import {client} from '@/sanity/lib/client'
import {isRateLimited} from '@/sanity/lib/formRateLimit'
import {getFormWriteClient} from '@/sanity/lib/formWriteClient'
import {answerRows, HONEYPOT_FIELD, validateForm, type Values} from '@/sanity/lib/forms'
import {FORM_FOR_SUBMIT_QUERY} from '@/sanity/lib/queries'
import {verifyRecaptcha} from '@/sanity/lib/recaptcha'

const MAX_BODY_BYTES = 50_000

// A hung upstream must not hold the request (and leave the visitor's button on "Sending…").
const SANITY_READ_TIMEOUT_MS = 8000

// Must match the action the browser requests the token for (components/ui/form/Recaptcha.tsx).
const RECAPTCHA_ACTION = 'form_submit'

// Sanity document ids; anything else (including `drafts.`/`versions.` ids) is not a form we serve.
const FORM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

const json = (body: unknown, status = 200) => Response.json(body, {status})

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * The request body as text, or null if it is over `limit` bytes. Reads the stream and counts bytes
 * as they arrive, so a chunked body (which has no Content-Length) is cut off at the cap instead of
 * being buffered whole, and the count is in bytes, not UTF-16 units.
 */
async function readCappedBody(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const {done, value} = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel().catch(() => {})
        return null
      }
      chunks.push(value)
    }
  } catch {
    return ''
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Stores a form submission. The order is deliberate: the cheap checks come first, the form is
 * always re-read from Sanity (never trusted from the browser), and the answers are re-validated
 * with the same logic the browser uses, which also drops anything the form did not ask for.
 */
export async function POST(request: Request, ctx: {params: Promise<{formId: string}>}) {
  const {formId} = await ctx.params
  if (!FORM_ID.test(formId)) return json({error: 'not-found'}, 404)
  const ip = clientIp(request)

  if (isRateLimited(ip)) return json({error: 'rate-limited'}, 429)

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return json({error: 'invalid'}, 413)
  }
  const text = await readCappedBody(request, MAX_BODY_BYTES)
  if (text === null) return json({error: 'invalid'}, 413)
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return json({error: 'invalid'}, 400)
  }

  // A bot filled the hidden field. Answer as if it worked so it learns nothing, and store nothing.
  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD] !== '') {
    return json({ok: true})
  }

  const values = body.values
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    return json({error: 'invalid'}, 400)
  }

  const token = typeof body.recaptchaToken === 'string' ? body.recaptchaToken : undefined
  if (!(await verifyRecaptcha(token, ip, RECAPTCHA_ACTION))) return json({error: 'captcha'}, 400)

  let form
  try {
    form = await client.withConfig({useCdn: false}).fetch(
      FORM_FOR_SUBMIT_QUERY,
      {id: formId},
      {signal: AbortSignal.timeout(SANITY_READ_TIMEOUT_MS)},
    )
  } catch (error) {
    console.error('Could not read a form for a submission', error)
    return json({error: 'server'}, 500)
  }
  if (!form) return json({error: 'not-found'}, 404)

  const {errors, clean} = validateForm(form, values as Values)
  if (Object.keys(errors).length > 0) return json({errors}, 422)

  try {
    await getFormWriteClient().create({
      _type: 'formSubmission',
      form: {_type: 'reference', _ref: form._id, _weak: true},
      formTitle: form.title,
      submittedAt: new Date().toISOString(),
      status: 'new',
      answers: answerRows(form, clean),
    })
  } catch (error) {
    console.error('Could not store a form submission', error)
    return json({error: 'server'}, 500)
  }
  return json({ok: true})
}
