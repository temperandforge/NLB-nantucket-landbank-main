import type {CSSProperties} from 'react'
import {stegaClean, type PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const

export default function BasicLeftRightText({block}: BlockProps<'basicLeftRightText'>) {
  // stegaClean: in Presentation the value carries invisible characters.
  const Heading = stegaClean(block.headingLevel) === 'h1' ? 'h1' : 'h2'
  // A button needs a label and a link that resolves; anything else would be a dead button.
  const buttons = (block.buttons ?? []).flatMap((button) => {
    const href = button.link ? linkResolver(button.link as DereferencedLink) : null
    if (!button.label || !href) return []
    const chosen = stegaClean(button.variant)
    const variant = BUTTON_VARIANTS.find((v) => v === chosen) ?? 'primary'
    return [{key: button._key, label: button.label, href, variant, newTab: Boolean(button.link?.openInNewTab)}]
  })

  // The entrance stagger counts siblings inside each wrapper, so the buttons (alone in theirs)
  // would start before the text above them. Continue the count from the text's position instead.
  const textParts = [block.eyebrow, block.heading, block.description].filter(Boolean).length

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s6">
      {/* The line art is 1684px wide (Figma 2441:15140), centred behind the section and cropped by
          it, so the lines run off both edges. The layer is at least that wide and the section's
          overflow-clip trims it; `cover` on a layer exactly as wide as the section would shrink the
          whole drawing to fit and stop the lines short of the edges. The lines themselves only span
          x=88..1633 of the 1684 canvas (92%), so on a viewport wider than ~1540px the 1684px floor
          leaves them short of the edges; scaling the layer to 115vw keeps them past both edges at
          any width. */}
      <div
        className="basic-left-right__lines pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full min-w-[max(1684px,115vw)] -translate-x-1/2"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full flex-col gap-20 tf-max-w md:flex-row md:items-start">
        {/* Pinned below the header from md, where the columns sit side by side, so the heading and
            buttons stay in view while a long right column scrolls past (as on the event page). The
            column is capped to the visible height and scrolls inside itself only when its content is taller than that, so CMS text taller than
            a short screen is never cut off. Scroll chaining stays on: once the column reaches its
            end the page scrolls on. The padding balanced by the negative margin gives focus
            rings and the rise of the entrance animation (--enter-rise, 14px) room inside that
            scroll box, which would otherwise clip them, without moving the text. */}
        <div className="flex w-full flex-col items-start gap-8 md:sticky md:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] md:-m-4 md:max-h-[calc(100dvh-var(--header-offset,var(--header-height))-5rem)] md:max-w-[560px] md:flex-1 md:overflow-y-auto md:p-4 md:transition-[top] md:duration-200 md:ease-out motion-reduce:transition-none">
          {(block.eyebrow || block.heading || block.description) && (
            <div className="flex w-full flex-col items-start gap-6 text-on-background">
              {block.eyebrow && <Eyebrow className="text-on-background">{block.eyebrow}</Eyebrow>}
              {block.heading && (
                <Heading className="w-full text-headline-xl text-on-background text-balance">{block.heading}</Heading>
              )}
              {block.description && (
                <p className="w-full whitespace-pre-line font-sans text-body-base leading-[1.6]">{block.description}</p>
              )}
            </div>
          )}
          {buttons.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {buttons.map((button, index) => (
                <ButtonLink
                  key={button.key}
                  label={button.label}
                  href={button.href}
                  variant={button.variant}
                  newTab={button.newTab}
                  rightIcon
                  style={{'--n': textParts + index} as CSSProperties}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-start md:flex-1">
          {block.rightContent && (
            <CustomPortableText
              variant="basic"
              className="w-full"
              value={block.rightContent as PortableTextBlock[]}
            />
          )}
        </div>
      </div>
    </section>
  )
}
