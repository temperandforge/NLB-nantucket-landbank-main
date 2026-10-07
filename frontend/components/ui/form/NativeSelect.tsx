import {ChevronDownIcon} from '@/components/icons'

import Field from './Field'
import {describedBy, type ControlProps} from './types'

/**
 * A single choice. A native <select>, styled to the Input: it is the most dependable control for
 * keyboard and screen-reader users, and the browser supplies the open list.
 */
export default function NativeSelect({field, id, value, error, onChange, onBlur}: ControlProps) {
  const selected = typeof value === 'string' ? value : ''
  return (
    <Field
      id={id}
      name={field.name as string}
      label={field.label as string}
      required={Boolean(field.required)}
      helperText={field.helperText}
      error={error}
    >
      <div className="relative">
        <select
          id={id}
          name={field.name ?? undefined}
          aria-required={field.required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, field, error)}
          value={selected}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`form-control form-select ${selected ? '' : 'form-control-empty'}`}
        >
          <option value="">{field.placeholder || 'Select one'}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-3 size-6 text-on-background" />
      </div>
    </Field>
  )
}
