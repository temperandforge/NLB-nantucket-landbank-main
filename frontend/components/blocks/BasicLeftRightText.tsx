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
        <div className="flex w-full flex-col items-start gap-10 md:flex-1">
          {block.eyebrow && <Eyebrow className="text-on-background">{block.eyebrow}</Eyebrow>}
          {block.heading && (
            <Heading className="w-full text-headline-xl text-on-background text-balance">{block.heading}</Heading>
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
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col items-start md:flex-1">
          {block.rightContent && (
            <CustomPortableText variant="basic" value={block.rightContent as PortableTextBlock[]} />
          )}
        </div>
      </div>
    </section>
  )
}
