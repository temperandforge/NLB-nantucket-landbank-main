import {CalendarIcon, Clock2Icon} from '@/components/icons'

import Field from './Field'
import {describedBy, type ControlProps} from './types'

const INPUT_TYPES: Record<string, string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  number: 'text',
  date: 'date',
  time: 'time',
}

/**
 * text, email, phone, number, date and time. Number is a text input with a decimal keypad rather
 * than type="number", which scrolls its value with the mouse wheel and reads poorly with a screen
 * reader; the logic validates it. Date and time keep the browser's picker.
 */
export default function TextInput({field, id, value, error, onChange, onBlur}: ControlProps) {
  const type = INPUT_TYPES[field.fieldType ?? 'text'] ?? 'text'
  const Icon = field.fieldType === 'date' ? CalendarIcon : field.fieldType === 'time' ? Clock2Icon : null
  const input = (
    <input
      id={id}
      name={field.name ?? undefined}
      type={type}
      inputMode={field.fieldType === 'number' ? 'decimal' : undefined}
      autoComplete={field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : undefined}
      placeholder={field.placeholder ?? undefined}
      maxLength={field.maxLength ?? undefined}
      required={false}
      aria-required={field.required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, field, error)}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className="form-control"
    />
  )
  return (
    <Field
      id={id}
      name={field.name as string}
      label={field.label as string}
      required={Boolean(field.required)}
      helperText={field.helperText}
      error={error}
    >
      {Icon ? (
        <div className="form-icon-field">
          {input}
          <Icon className="pointer-events-none absolute right-3 top-3 size-6 text-on-background" />
        </div>
      ) : (
        input
      )}
    </Field>
  )
}
