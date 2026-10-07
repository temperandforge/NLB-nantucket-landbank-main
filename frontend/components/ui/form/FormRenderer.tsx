'use client'

import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from 'react'

import {ArrowRightIcon} from '@/components/icons'
import {
  HONEYPOT_FIELD,
  validateField,
  validateForm,
  visibleFields,
  type Values,
} from '@/sanity/lib/forms'
import type {FormContent} from '@/sanity/lib/types'

import ChoiceGroup from './ChoiceGroup'
import MultiSelect from './MultiSelect'
import NativeSelect from './NativeSelect'
import Textarea from './Textarea'
import TextInput from './TextInput'
import Turnstile from './Turnstile'
import type {ControlProps, FormField} from './types'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

const MESSAGES = {
  network: 'We could not reach the server. Check your connection and try again.',
  limited: 'Too many attempts. Please wait a few minutes and try again.',
  captcha: 'We could not verify that you are human. Please try again.',
  generic: 'Something went wrong. Please try again.',
}

function Control(props: ControlProps) {
  switch (props.field.fieldType) {
    case 'textarea':
      return <Textarea {...props} />
    case 'select':
      return <NativeSelect {...props} />
    case 'multiSelect':
      return <MultiSelect {...props} />
    case 'checkboxGroup':
    case 'radioGroup':
      return <ChoiceGroup {...props} />
    default:
      return <TextInput {...props} />
  }
}

/**
 * A form, as the Figma designs lay it out. Answers live here; the shared logic decides what is
 * shown and what is valid, and the route repeats the same checks on the server. Validation runs
 * on blur and on submit; a failed submit moves focus to the first invalid field and announces
 * the problem. What the visitor typed is kept through every failure.
 */
export default function FormRenderer({form}: {form: FormContent}) {
  const baseId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  // Set synchronously, so a second submit in the same tick cannot slip past the state check.
  const sending = useRef(false)
  const [values, setValues] = useState<Values>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [token, setToken] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const onToken = useCallback((next: string) => setToken(next), [])

  const shown = visibleFields(form, values)
  const shownNames = new Set(shown.map((field) => field.name as string))
  const visibleErrors = Object.keys(errors).filter((name) => shownNames.has(name))

  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  function focusField(name: string) {
    formRef.current
      ?.querySelector<HTMLElement>(
        `[data-field-name="${CSS.escape(name)}"] :is(input, select, textarea, button)`,
      )
      ?.focus()
  }

  function setError(field: FormField, answer: string | string[] | undefined) {
    const message = validateField(field, answer)
    setErrors((prev) => {
      const next = {...prev}
      if (message) next[field.name as string] = message
      else delete next[field.name as string]
      return next
    })
  }

  function change(field: FormField, answer: string | string[]) {
    setValues((prev) => ({...prev, [field.name as string]: answer}))
    // Clear an error as soon as the answer fixes it; never raise a new one mid-typing.
    if (errors[field.name as string] && !validateField(field, answer)) setError(field, answer)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (status === 'submitting' || sending.current) return
    setAttempted(true)
    setServerError(null)
    const found = validateForm(form, values).errors
    setErrors(found)
    const first = shown.find((field) => found[field.name as string])
    if (first) return focusField(first.name as string)

    sending.current = true
    setStatus('submitting')
    try {
      const response = await fetch(`/api/forms/${form._id}`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({values, turnstileToken: token, [HONEYPOT_FIELD]: honeypot}),
      })
      if (response.ok) {
        setStatus('success')
        return
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        errors?: Record<string, string>
      }
      if (response.status === 422 && data.errors) {
        setErrors(data.errors)
        const invalid = shown.find((field) => data.errors?.[field.name as string])
        if (invalid) focusField(invalid.name as string)
      } else {
        setServerError(
          response.status === 429
            ? MESSAGES.limited
            : data.error === 'captcha'
              ? MESSAGES.captcha
              : MESSAGES.generic,
        )
      }
    } catch {
      setServerError(MESSAGES.network)
    } finally {
      sending.current = false
    }
    // A Turnstile token is single-use, so ask for a new one after any failed attempt.
    setToken('')
    setResetKey((key) => key + 1)
    setStatus('idle')
  }

  if (status === 'success') {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="w-full text-body-base text-on-background"
      >
        {form.successMessage}
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex w-full flex-col gap-10">
      {attempted && visibleErrors.length > 0 && (
        <p role="alert" className="form-helper form-helper-error">
          {visibleErrors.length === 1
            ? 'There is 1 field to fix below.'
            : `There are ${visibleErrors.length} fields to fix below.`}
        </p>
      )}

      {(form.sections ?? []).map((section) => {
        const fields = (section.fields ?? []).filter((field) => shownNames.has(field.name as string))
        if (fields.length === 0) return null
        const grid = (
          <div className={`grid gap-5 ${section.columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            {fields.map((field) => (
              <div
                key={field._key}
                className={section.columns === 2 && field.width !== 'half' ? 'sm:col-span-2' : undefined}
              >
                <Control
                  field={field}
                  id={`${baseId}-${field.name}`}
                  value={values[field.name as string]}
                  error={errors[field.name as string] ?? null}
                  onChange={(answer) => change(field, answer)}
                  onBlur={() => setError(field, values[field.name as string])}
                />
              </div>
            ))}
          </div>
        )
        return section.heading ? (
          <fieldset key={section._key} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            <legend className="form-section-heading mb-5">{section.heading}</legend>
            {grid}
          </fieldset>
        ) : (
          <div key={section._key}>{grid}</div>
        )
      })}

      {/* The honeypot: out of sight, out of the tab order, and hidden from assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      {SITE_KEY && <Turnstile siteKey={SITE_KEY} resetKey={resetKey} onToken={onToken} />}

      {serverError && (
        <p role="alert" className="form-helper form-helper-error">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="button button-secondary self-start"
      >
        {status === 'submitting' ? 'Sending…' : form.submitLabel || 'Submit'}
        <ArrowRightIcon className="size-6 shrink-0" />
      </button>
    </form>
  )
}
