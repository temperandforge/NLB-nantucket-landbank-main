'use client'

import {useEffect, useId, useRef, useState} from 'react'

import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'
import type {FilterTab} from '@/sanity/lib/archiveFilter'

function Row({label, checked, onToggle}: {label: string; checked: boolean; onToggle: () => void}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2 font-sans text-body-base text-on-surface-light">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-5 shrink-0 cursor-pointer accent-moody-moor-600"
      />
    </label>
  )
}

/**
 * One filter dropdown for a records tab (Figma: a button that opens a white panel of checkbox
 * rows, "View All" first). The look is the Properties filter's, but only one option can be chosen:
 * choosing the chosen one again, or "View All", clears it. A button with aria-expanded, closed by
 * Escape (focus returns to the button) or a press outside. Renders nothing when there are no
 * options. Without `onChange` the rows do nothing (only until the page has loaded).
 */
export default function RecordFilterMenu({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: FilterTab[]
  value: string | null
  onChange?: (value: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (options.length === 0) return null
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`flex w-[214px] cursor-pointer items-center justify-between rounded border bg-input px-5 py-4 font-mono text-body-base text-on-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 ${
          open || value ? 'border-border-light' : 'border-transparent'
        }`}
      >
        <span>{value ? `${label}: ${value}` : label}</span>
        <Chevron className="size-6 shrink-0" />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-10 mt-2 flex w-[266px] flex-col rounded bg-surface-light p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
        >
          <Row label="View All" checked={value === null} onToggle={() => onChange?.(null)} />
          {options.map((option) => (
            <Row
              key={option.slug}
              label={option.title}
              checked={value === option.slug}
              onToggle={() => onChange?.(value === option.slug ? null : option.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
