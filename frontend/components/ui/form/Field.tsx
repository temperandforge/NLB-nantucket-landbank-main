import type {ReactNode} from 'react'

/**
 * The label, control and message of one field. An error replaces the helper text and is read out
 * with the control through aria-describedby. The asterisk is decoration: the control itself carries
 * aria-required.
 */
export default function Field({
  id,
  name,
  label,
  required,
  helperText,
  error,
  counter,
  children,
}: {
  id: string
  name: string
  label: string
  required: boolean
  helperText?: string | null
  error: string | null
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1" data-field-name={name}>
      <label
        id={`${id}-label`}
        htmlFor={id}
        className={`form-label ${error ? 'form-label-error' : ''}`}
      >
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {(error || helperText) && (
        <p id={`${id}-message`} className={`form-helper ${error ? 'form-helper-error' : ''}`}>
          {error || helperText}
        </p>
      )}
      {counter}
    </div>
  )
}
