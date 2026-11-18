'use client'

import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react'

import {ChevronDownIcon, SquareCheckIcon, SquareIcon} from '@/components/icons'
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
  // Scroll the active row into view only when the keyboard moved it: under the mouse the row is
  // already visible, and scrolling on hover makes the list jump beneath the pointer.
  const keyboardMoved = useRef(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const multi = field.fieldType === 'multiSelect'
  const options = field.options ?? []
  // An optional single select starts with a "None" row (the empty string), the way the native
  // <select> it replaced had a blank option, so a chosen answer can be taken back. Required ones
  // never offer it, and a multi select clears by unticking.
  const clearable = !multi && !field.required
  const entries = clearable ? ['', ...options] : options
  const labelOf = (entry: string) => entry || 'None'
  const chosen = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []
  const summary =
    chosen.length > 0 ? options.filter((option) => chosen.includes(option)).join(', ') : field.placeholder || (multi ? 'Select all that apply' : 'Select one')
  const optionId = (index: number) => `${listId}-${index}`

  // Focus moves into the list while it is open; the wrapper's blur check treats that as staying inside.
  useEffect(() => {
    if (open) list.current?.focus({preventScroll: true})
  }, [open])

  // Keep the active option visible when the list scrolls.
  useEffect(() => {
    if (open && active >= 0 && keyboardMoved.current) document.getElementById(`${listId}-${active}`)?.scrollIntoView({block: 'nearest'})
  }, [open, active, listId])

  // The list unmounts with the field; don't leave the typeahead timer behind.
  useEffect(() => () => clearTimeout(typedTimer.current), [])

  function openList() {
    const first = entries.findIndex((entry) => entry !== '' && chosen.includes(entry))
    keyboardMoved.current = true
    setActive(entries.length === 0 ? -1 : first === -1 ? 0 : first)
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
    } else if (clearable && (event.key === 'Backspace' || event.key === 'Delete') && chosen.length > 0) {
      // A shortcut for the "None" row, without opening the list.
      event.preventDefault()
      onChange('')
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const {key} = event
    keyboardMoved.current = true
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault()
      setActive((current) => moveActive(current, entries.length, key))
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      // A held key repeats; for a multi select that would tick and untick the row.
      if (!event.repeat && active >= 0 && active < entries.length) choose(entries[active])
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
      const match = typeaheadMatch(entries.map(labelOf), typedText.current, active)
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
            {entries.map((option, index) => {
              const selected = option === '' ? chosen.length === 0 : chosen.includes(option)
              return (
                <li
                  key={option || '__none'}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  data-active={index === active}
                  onMouseMove={() => {
                    keyboardMoved.current = false
                    setActive(index)
                  }}
                  // mouseDown, not click: a click would blur the list first and close it.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option)
                  }}
                  className="form-option"
                >
                  <span>{labelOf(option)}</span>
                  {/* The design's menu uses the square for both kinds, including Contact Us's single topic. */}
                  {selected ? <SquareCheckIcon className="size-6 shrink-0" /> : <SquareIcon className="size-6 shrink-0" />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Field>
  )
}
