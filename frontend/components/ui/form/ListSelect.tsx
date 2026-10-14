'use client'

import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react'

import {CheckIcon, ChevronDownIcon, SquareCheckIcon, SquareIcon} from '@/components/icons'
import {moveActive, typeaheadMatch} from '@/sanity/lib/listbox'

import Field from './Field'
import {describedBy, type ControlProps} from './types'

/**
 * A dropdown, one choice (`select`) or several (`multiSelect`), with the design's styled list
 * (Figma: Entertainment, Transportation, and the menu in Contact Us). A button that opens a
 * listbox. A native <select> cannot style its open list and <select multiple> renders as an open
 * box, so this follows the ARIA listbox pattern instead; see the keyboard contract in the plan.
 * A single choice closes the list and returns focus to the button; several stay open. Closing on
 * blur keeps Tab from leaving an open list behind.
 */
export default function ListSelect({field, id, value, error, onChange, onBlur}: ControlProps) {
  const listId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typedText = useRef('')
  const typedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const multi = field.fieldType === 'multiSelect'
  const options = field.options ?? []
  const chosen = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
  const summary =
    chosen.length > 0 ? chosen.join(', ') : field.placeholder || (multi ? 'Select all that apply' : 'Select one')
  const optionId = (index: number) => `${listId}-${index}`

  // Focus moves into the list while it is open; the wrapper's blur check treats that as staying inside.
  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])

  // Keep the active option visible when the list scrolls.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({block: 'nearest'})
  }, [open, active, listId])

  // The list unmounts with the field; don't leave the typeahead timer behind.
  useEffect(() => () => clearTimeout(typedTimer.current), [])

  function openList() {
    const first = options.findIndex((option) => chosen.includes(option))
    setActive(options.length === 0 ? -1 : first === -1 ? 0 : first)
    setOpen(true)
  }

  function closeList(returnFocus: boolean) {
    setOpen(false)
    setActive(-1)
    if (returnFocus) trigger.current?.focus()
  }

  function choose(option: string) {
    if (!multi) {
      onChange(option)
      closeList(true)
      return
    }
    onChange(chosen.includes(option) ? chosen.filter((item) => item !== option) : [...chosen, option])
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const {key} = event
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault()
      setActive((current) => moveActive(current, options.length, key))
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      if (active >= 0 && active < options.length) choose(options[active])
    } else if (key === 'Escape') {
      event.preventDefault()
      closeList(true)
    } else if (key === 'Tab' && event.shiftKey) {
      // Shift+Tab would land on the trigger, which is inside the wrapper, so blur would not close.
      event.preventDefault()
      closeList(true)
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      clearTimeout(typedTimer.current)
      typedText.current += key
      typedTimer.current = setTimeout(() => {
        typedText.current = ''
      }, 600)
      const match = typeaheadMatch(options, typedText.current, active)
      if (match !== -1) setActive(match)
    }
    // Plain Tab is left alone: focus leaves the wrapper and onBlur below closes the list.
  }

  return (
    <Field
      id={id}
      name={field.name as string}
      label={field.label as string}
      prompt={field.prompt}
      required={Boolean(field.required)}
      helperText={field.helperText}
      error={error}
    >
      <div
        ref={wrapper}
        className="relative"
        onBlur={(event) => {
          // Focus left the control entirely (open or not): close and let the form validate.
          if (!wrapper.current?.contains(event.relatedTarget as Node | null)) {
            closeList(false)
            onBlur()
          }
        }}
      >
        <button
          ref={trigger}
          id={id}
          type="button"
          // Select-only combobox. Focus moves to the list while it is open, a deliberate departure
          // from the APG pattern (which keeps focus here); combobox still fits because the trigger
          // is the control that names the value, opens the popup and carries required/invalid.
          role="combobox"
          aria-labelledby={`${id}-label ${id}-value`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-required={field.required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, field, error)}
          // Safari and Firefox on macOS do not focus a clicked button, so the list's blur would see no
          // related target and close it just before this click reopened it.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? closeList(true) : openList())}
          onKeyDown={onTriggerKeyDown}
          className={`form-control flex items-center justify-between gap-5 ${
            chosen.length === 0 ? 'form-control-empty' : ''
          }`}
        >
          <span id={`${id}-value`} className="truncate">
            {summary}
          </span>
          <ChevronDownIcon className="size-6 shrink-0 text-on-background" />
        </button>
        {open && (
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-multiselectable={multi || undefined}
            aria-required={field.required || undefined}
            aria-invalid={error ? true : undefined}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className="form-menu"
          >
            {options.map((option, index) => {
              const selected = chosen.includes(option)
              return (
                <li
                  key={option}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  data-active={index === active}
                  onMouseMove={() => setActive(index)}
                  // mouseDown, not click: a click would blur the list first and close it.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option)
                  }}
                  className="form-option"
                >
                  <span>{option}</span>
                  {multi ? (
                    selected ? (
                      <SquareCheckIcon className="size-6" />
                    ) : (
                      <SquareIcon className="size-6" />
                    )
                  ) : (
                    selected && <CheckIcon className="size-6" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Field>
  )
}
