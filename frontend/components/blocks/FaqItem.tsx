'use client'

import {useId, useRef, useState} from 'react'

import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'

/**
 * One accordion item, as in nlb-design's FaqItem. The heading wraps a real button
 * (aria-expanded, aria-controls) and the answer is a sibling, not nested inside the button
 * (nlb-design nested a paragraph in a button, which is invalid HTML). Items open independently.
 */
export default function FaqItem({question, children}: {question: string; children: React.ReactNode}) {
  const [open, setOpen] = useState(false)
  const answerId = useId()
  const answerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      // The whole card toggles, padding included. The button stays the keyboard / screen-reader
      // control (its click bubbles here); clicks inside the answer don't toggle, so its text can
      // be selected and its links followed.
      onClick={(event) => {
        if (answerRef.current?.contains(event.target as Node)) return
        setOpen((isOpen) => !isOpen)
      }}
      className={`flex w-full cursor-pointer flex-col items-start overflow-clip rounded p-6 text-left transition-colors duration-200 motion-reduce:transition-none ${
        // Figma open state (2103:36336): the card takes the page background; a hairline keeps it
        // visible on a page that is the same colour.
        open ? 'bg-background ring-1 ring-inset ring-border-light' : 'bg-surface-dark'
      }`}
    >
      <h4 className="w-full">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
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
      {/* Height and opacity ease together (0fr -> 1fr grid row). `hidden` can't animate, so a closed
          answer is `inert` + `invisible` instead, keeping it out of tab order and the a11y tree. */}
      <div
        id={answerId}
        ref={answerRef}
        inert={!open}
        className={`grid w-full cursor-auto text-on-surface-dark transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {/* The old flex gap-8 can't collapse with the row, so the spacing lives inside it. */}
          <div className="pt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
