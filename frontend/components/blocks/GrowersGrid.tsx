'use client'

import {type CSSProperties, useState} from 'react'

import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import type {ExtractPageBuilderType} from '@/sanity/lib/types'

type Grower = NonNullable<ExtractPageBuilderType<'growers'>['growers']>[number] & {name: string}

/** How many growers show before "View more growers" is pressed. Mirrors the Studio field note. */
const PAGE_SIZE = 6

/** Cards that come in after "View more growers" are offset by this much, so a batch cascades. */
const REVEAL_STEP_MS = 70

export default function GrowersGrid({growers}: {growers: Grower[]}) {
  const [shown, setShown] = useState(PAGE_SIZE)
  if (growers.length === 0) return null

  return (
    <>
      <ul className="m-0 grid w-full list-none grid-cols-1 gap-x-3 gap-y-10 p-0 md:grid-cols-2 md:gap-y-12">
        {growers.slice(0, shown).map((grower, index) => (
          // The first page is part of the page's own entrance. A card added by the button plays the
          // scroll-reveal fade and rise itself (motion.css, `data-reveal="shown"`), staggered by its
          // place in its batch: ScrollReveal leaves a part that is already on screen alone, so
          // without this the cards the click brings into view would pop in. The attribute is on the
          // card for good, so a re-render never touches it, and reduced motion drops the animation.
          <li
            key={grower._key}
            className="flex flex-col items-center gap-5 md:gap-6"
            {...(index >= PAGE_SIZE && {
              'data-reveal': 'shown',
              style: {'--reveal-delay': `${(index % PAGE_SIZE) * REVEAL_STEP_MS}ms`} as CSSProperties,
            })}
          >
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
      {/* Said aloud when the button reveals more; there is nothing to announce at first. */}
      <p role="status" className="sr-only">
        {shown > PAGE_SIZE ? `Showing ${Math.min(shown, growers.length)} of ${growers.length} growers` : ''}
      </p>
      {shown < growers.length && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE_SIZE)}
          className="button button-primary"
        >
          <span>View more growers</span>
        </button>
      )}
    </>
  )
}
