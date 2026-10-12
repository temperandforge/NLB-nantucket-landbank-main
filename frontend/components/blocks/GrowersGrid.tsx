'use client'

import {useState} from 'react'

import BlockImage from '@/components/blocks/BlockImage'
import {ChevronDownIcon} from '@/components/icons'
import Tag from '@/components/ui/Tag'
import type {ExtractPageBuilderType} from '@/sanity/lib/types'

type Grower = NonNullable<ExtractPageBuilderType<'growers'>['growers']>[number] & {name: string}

/** How many growers show before "View more growers" is pressed. Mirrors the Studio field note. */
const PAGE_SIZE = 6

export default function GrowersGrid({growers}: {growers: Grower[]}) {
  const [shown, setShown] = useState(PAGE_SIZE)
  if (growers.length === 0) return null

  return (
    <>
      <ul className="m-0 grid w-full list-none grid-cols-1 gap-x-3 gap-y-10 p-0 md:grid-cols-2 md:gap-y-12">
        {growers.slice(0, shown).map((grower) => (
          <li key={grower._key} className="flex flex-col items-center gap-5 md:gap-6">
            <div className="relative flex h-[375px] w-full flex-col items-center justify-end overflow-clip rounded">
              <BlockImage
                image={grower.image}
                width={1000}
                sizes="(min-width: 768px) 50vw, 100vw"
                fill
                className="absolute inset-0 size-full object-cover"
              />
              {grower.tag && <Tag label={grower.tag} rounded={false} className="relative w-full" />}
            </div>
            <p className="w-full text-center text-headline-sm leading-[1.2] tracking-normal">
              {grower.name}
            </p>
          </li>
        ))}
      </ul>
      {shown < growers.length && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE_SIZE)}
          className="button button-primary"
        >
          <span>View more growers</span>
          <ChevronDownIcon className="size-6 shrink-0" />
        </button>
      )}
    </>
  )
}
