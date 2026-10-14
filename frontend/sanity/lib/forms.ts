/**
 * Form logic shared by the browser form and the submit route: which fields are shown, whether the
 * answers are valid, and the rows stored on a submission. Pure and dependency-free so it can be
 * checked with `node scripts/verifyFormLogic.mts`; it must keep using relative imports only.
 *
 * Input is treated as untrusted (the route feeds it a visitor's JSON), so every lookup of an
 * answer by field name goes through `own`, and anything not defined by the form is ignored.
 */

/** The hidden field bots fill in. Real visitors never see it. */
export const HONEYPOT_FIELD = 'nlb_hp'

export type AnswerValue = string | string[]
export type Values = Record<string, AnswerValue>

/**
 * The part of a form field the logic needs. Structural, so the generated query result type is
 * assignable to it; every property a GROQ projection can null is optional here.
 */
export type FormFieldLike = {
  _key: string
  name?: string | null
  label?: string | null
  fieldType?: string | null
  required?: boolean | null
  maxLength?: number | null
  options?: string[] | null
  showIf?: {field?: string | null; equals?: string | null} | null
}

export type FormLike = {
  sections?: {fields?: FormFieldLike[] | null}[] | null
}

const MULTI_TYPES = ['multiSelect', 'checkboxGroup']
const CHOICE_TYPES = ['select', 'radioGroup', ...MULTI_TYPES]

export function isMultiType(type?: string | null): boolean {
  return type != null && MULTI_TYPES.includes(type)
}

export function isChoiceType(type?: string | null): boolean {
  return type != null && CHOICE_TYPES.includes(type)
}

function own(values: Values, name: string): AnswerValue | undefined {
  return Object.hasOwn(values, name) ? values[name] : undefined
}

/** Every field in form order. A field without a name, label or type cannot be rendered, so it is dropped. */
export function allFields(form: FormLike): FormFieldLike[] {
  return (form.sections ?? []).flatMap((section) =>
    (section?.fields ?? []).filter(
      (field): field is FormFieldLike => Boolean(field?.name && field.label && field.fieldType),
    ),
  )
}

function matches(value: AnswerValue | undefined, equals?: string | null): boolean {
  if (value === undefined || equals == null) return false
  return Array.isArray(value) ? value.includes(equals) : value === equals
}

/**
 * The fields to show for the answers so far. A field with a `showIf` is shown only while its
 * controlling field is itself shown and holds the value, so a hidden field's stale answer cannot
 * keep dependants alive.
 */
export function visibleFields(form: FormLike, values: Values): FormFieldLike[] {
  const shown = new Set<string>()
  const result: FormFieldLike[] = []
  for (const field of allFields(form)) {
    const name = field.name as string
    const rule = field.showIf
    if (rule?.field) {
      if (!shown.has(rule.field) || !matches(own(values, rule.field), rule.equals)) continue
    }
    shown.add(name)
    result.push(field)
  }
  return result
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS = /^[0-9+().\-\s]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** The error for one field's answer, or null if it is acceptable. Empty optional answers are fine. */
export function validateField(field: FormFieldLike, raw: AnswerValue | undefined): string | null {
  const label = field.label ?? 'This field'
  const required = `${label} is required`
  const type = field.fieldType
  const allowed = field.options ?? []

  if (isMultiType(type)) {
    if (raw !== undefined && !Array.isArray(raw)) return `${label} is not valid`
    const list = raw ?? []
    if (list.length === 0) return field.required ? required : null
    return list.every((item) => allowed.includes(item)) ? null : `${label} is not valid`
  }

  if (raw !== undefined && typeof raw !== 'string') return `${label} is not valid`
  const value = (raw ?? '').trim()
  if (value === '') return field.required ? required : null

  switch (type) {
    case 'email':
      return EMAIL.test(value) ? null : 'Enter a valid email address'
    case 'phone':
      return PHONE_CHARS.test(value) && value.replace(/\D/g, '').length >= 7
        ? null
        : 'Enter a valid phone number'
    case 'number':
      return Number.isFinite(Number(value)) ? null : `${label} must be a number`
    case 'date':
      return isRealDate(value) ? null : `${label} must be a valid date`
    case 'time':
      return TIME.test(value) ? null : `${label} must be a valid time`
    case 'select':
    case 'radioGroup':
      return allowed.includes(value) ? null : `${label} is not valid`
    default:
      return field.maxLength && value.length > field.maxLength
        ? `${label} must be ${field.maxLength} characters or fewer`
        : null
  }
}

/**
 * Validates every shown field. `errors` is keyed by field name; `clean` holds only the answers to
 * keep: shown fields, trimmed, non-empty. Hidden, unknown and empty answers are left out.
 */
export function validateForm(
  form: FormLike,
  values: Values,
): {errors: Record<string, string>; clean: Values} {
  // Null-prototype objects, so a field named like an Object.prototype key is ordinary data.
  const errors = Object.create(null) as Record<string, string>
  const clean = Object.create(null) as Values
  for (const field of visibleFields(form, values)) {
    const name = field.name as string
    const raw = own(values, name)
    const message = validateField(field, raw)
    if (message) {
      errors[name] = message
      continue
    }
    const value = Array.isArray(raw) ? raw : (raw ?? '').trim()
    if (value.length > 0) clean[name] = value
  }
  return {errors, clean}
}

/** The rows stored on a submission, in field order. A list is stored as its labels joined with ", ". */
export function answerRows(form: FormLike, clean: Values) {
  return allFields(form).flatMap((field) => {
    const name = field.name as string
    if (!Object.hasOwn(clean, name)) return []
    const value = clean[name]
    return [
      {
        _key: name,
        name,
        label: field.label as string,
        value: Array.isArray(value) ? value.join(', ') : value,
      },
    ]
  })
}
