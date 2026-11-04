'use client'

import {useId, useState} from 'react'

import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'

/**
 * One accordion item, as in nlb-design's FaqItem. The heading wraps a real button
 * (aria-expanded, aria-controls) and the answer is a sibling, not nested inside the button
 * (nlb-design nested a paragraph in a button, which is invalid HTML). Items open independently.
 */
export default function FaqItem({question, children}: {question: string; children: React.ReactNode}) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <div
      className={`flex w-full flex-col items-start overflow-clip rounded p-6 text-left transition-colors duration-300 ease-out motion-reduce:transition-none ${
        // Figma open state (2103:36336): hover-lighter at 70% over surface-dark, no border. The
        // token is opaque here, so the 70% is applied with color-mix (which also transitions).
        open
          ? 'bg-[color-mix(in_srgb,var(--color-hover-lighter)_70%,var(--color-surface-dark))]'
          : 'bg-surface-dark'
      }`}
    >
      <h4 className="w-full">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex w-full cursor-pointer items-start gap-10 text-left font-mono text-body-base leading-[1.6] text-on-surface-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moody-moor-500"
        >
          <span className="min-w-px flex-1 break-words">{question}</span>
          {open ? (
            <ChevronUpIcon className="size-6 shrink-0" />
          ) : (
            <ChevronDownIcon className="size-6 shrink-0" />
          )}
        </button>
      </h4>
      {/* Height animates via a 0fr -> 1fr grid row; `invisible` (delayed on close) keeps the
          collapsed answer out of the tab order and accessibility tree without cutting the motion. */}
      <div
        id={answerId}
        className={`grid w-full text-on-surface-dark transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
