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
    <div className="flex w-full flex-col items-start gap-8 overflow-clip rounded bg-surface-dark p-6 text-left">
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
      <div id={answerId} hidden={!open} className="w-full">
        {children}
      </div>
    </div>
  )
}
