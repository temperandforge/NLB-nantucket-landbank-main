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

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s6">
      <div className="basic-left-right__lines pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex w-full flex-col gap-20 tf-max-w md:flex-row md:items-start">
        {/* Pinned below the header from md, where the columns sit side by side, so the heading and
            buttons stay in view while a long right column scrolls past (as on the event page). The
            column is capped to the visible height and scrolls inside itself, so CMS text taller than
            a short screen is never cut off. The padding balanced by the negative margin gives focus
            rings room inside that scroll box without moving the text. */}
        <div className="flex w-full flex-col items-start gap-8 md:sticky md:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] md:-m-1 md:max-h-[calc(100dvh-var(--header-offset,var(--header-height))-5rem)] md:max-w-[560px] md:flex-1 md:overflow-y-auto md:overscroll-contain md:p-1 md:transition-[top] md:duration-200 md:ease-out motion-reduce:transition-none">
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
              {buttons.map((button) => (
                <ButtonLink
                  key={button.key}
                  label={button.label}
                  href={button.href}
                  variant={button.variant}
                  newTab={button.newTab}
                  rightIcon
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
