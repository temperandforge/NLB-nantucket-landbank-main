import type {FormContent} from '@/sanity/lib/types'

/** One field of a form, derived from the generated query result. */
export type FormField = NonNullable<
  NonNullable<NonNullable<FormContent['sections']>[number]['fields']>[number]
>

export type ControlProps = {
  field: FormField
  /** Unique within the page; the message and counter ids derive from it. */
  id: string
  value: string | string[] | undefined
  error: string | null
  onChange: (value: string | string[]) => void
  onBlur: () => void
}

/** The aria-describedby for a control: the message (helper or error) and, if any, the counter. */
export function describedBy(
  id: string,
  field: Pick<FormField, 'helperText'>,
  error: string | null,
  hasCounter = false,
): string | undefined {
  const ids = [error || field.helperText ? `${id}-message` : null, hasCounter ? `${id}-count` : null]
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}
