import Field from './Field'
import {describedBy, type ControlProps} from './types'

/** The text area variant of the Input. A character counter shows when a maximum length is set. */
export default function Textarea({field, id, value, error, onChange, onBlur}: ControlProps) {
  const text = typeof value === 'string' ? value : ''
  const max = field.maxLength ?? null
  return (
    <Field
      id={id}
      name={field.name as string}
      label={field.label as string}
      required={Boolean(field.required)}
      helperText={field.helperText}
      error={error}
      counter={
        max ? (
          <p id={`${id}-count`} className="form-helper">
            {text.length}/{max}
          </p>
        ) : null
      }
    >
      <textarea
        id={id}
        name={field.name ?? undefined}
        placeholder={field.placeholder ?? undefined}
        aria-required={field.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, field, error, Boolean(max))}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="form-control form-textarea"
      />
    </Field>
  )
}
