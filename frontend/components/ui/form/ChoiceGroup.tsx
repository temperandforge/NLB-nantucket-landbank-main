import {CircleDotIcon, CircleIcon, SquareCheckIcon, SquareIcon} from '@/components/icons'

import {describedBy, type ControlProps} from './types'

/**
 * Checkboxes (any number) or radio buttons (one). A <fieldset> with the question as its legend,
 * so a screen reader announces the question with each option. The native inputs are visually
 * replaced by the design's icons but stay in the tab order, so Tab, Space and (for radios) the
 * arrow keys work natively. Radios share a name, so the group is one tab stop.
 */
export default function ChoiceGroup({field, id, value, error, onChange, onBlur}: ControlProps) {
  const multi = field.fieldType === 'checkboxGroup'
  const chosen = multi ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? value : ''
  const Off = multi ? SquareIcon : CircleIcon
  const On = multi ? SquareCheckIcon : CircleDotIcon

  function toggle(option: string, checked: boolean) {
    if (!multi) return onChange(option)
    const list = chosen as string[]
    onChange(checked ? [...list, option] : list.filter((item) => item !== option))
  }

  return (
    <fieldset
      className="m-0 flex min-w-0 flex-col border-0 p-0"
      data-field-name={field.name ?? undefined}
      // Validate when focus leaves the whole group, not as it moves between its options.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur()
      }}
      // aria-required and aria-invalid are only supported on the radiogroup role, not on a plain
      // group. A checkbox group keeps aria-describedby: the asterisk is in the legend and the
      // error text is reached through the description.
      role={multi ? undefined : 'radiogroup'}
      aria-required={!multi ? field.required || undefined : undefined}
      aria-invalid={!multi && error ? true : undefined}
      aria-describedby={describedBy(id, field, error)}
    >
      <legend className="form-legend mb-3">
        {field.label}
        {field.required && <span aria-hidden="true">*</span>}
      </legend>
      {(field.options ?? []).map((option, index) => {
        const checked = multi ? (chosen as string[]).includes(option) : chosen === option
        const optionId = `${id}-${index}`
        return (
          <label key={option} htmlFor={optionId} className="form-choice">
            <input
              id={optionId}
              type={multi ? 'checkbox' : 'radio'}
              name={field.name ?? undefined}
              value={option}
              checked={checked}
              onChange={(event) => toggle(option, event.target.checked)}
              className="sr-only"
            />
            <span className="form-choice-box">
              {checked ? <On className="size-6" /> : <Off className="size-6" />}
            </span>
            <span>{option}</span>
          </label>
        )
      })}
      {(error || field.helperText) && (
        <p id={`${id}-message`} className={`form-helper mt-1 ${error ? 'form-helper-error' : ''}`}>
          {error || field.helperText}
        </p>
      )}
    </fieldset>
  )
}
