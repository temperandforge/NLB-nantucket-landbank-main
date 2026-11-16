import type {PortableTextBlock} from 'next-sanity'
import Image from 'next/image'

import CustomPortableText from '@/components/PortableText'

import FaqItem from './FaqItem'
import {BlockProps} from './types'

type Faq = NonNullable<BlockProps<'faqList'>['block']['ungrouped']>[number]

function FaqRows({faqs}: {faqs: Faq[]}) {
  return (
    <div className="flex w-full flex-col items-start gap-3">
      {faqs.map((faq) => (
        <FaqItem key={faq._id} question={faq.question}>
          {faq.answer && (
            <CustomPortableText
              variant="basic"
              className="[--rich-text-color:var(--color-on-surface-dark)]"
              value={faq.answer as PortableTextBlock[]}
            />
          )}
        </FaqItem>
      ))}
    </div>
  )
}

export default function FaqList({block}: BlockProps<'faqList'>) {
  const ungrouped = block.ungrouped ?? []
  const groups = (block.groups ?? []).filter((group) => group.faqs && group.faqs.length > 0)
  if (ungrouped.length === 0 && groups.length === 0) return null

  return (
    <section className="relative flex w-full overflow-clip bg-background tf-px py-s6">
      {/* Figma 1910:12152 places the 4204 x 569 art at x=-1382, y=189 in a 1440 x 1166 section: it
          starts 96% of the section width off the left edge and is 292% as wide, so its right end
          (where the two lines meet) is far past the right edge. Centring it at 150% pulled that
          corner into view. The height follows the art's own ratio, so nothing is stretched. */}
      <Image
        src="/images/blocks/decorative-line-faqs.svg"
        alt=""
        aria-hidden="true"
        width={4204}
        height={569}
        className="pointer-events-none absolute top-[16%] left-[-96%] z-0 h-auto w-[292%] max-w-none"
      />
      <div className="relative z-10 tf-max-w flex flex-col items-start gap-10 lg:flex-row lg:justify-between">
        {(block.heading || block.description) && (
          <div className="flex w-full flex-col items-start gap-6 lg:sticky lg:top-[calc(var(--header-offset,var(--header-height))+2.5rem)] lg:w-[318px] lg:shrink-0 lg:self-start lg:transition-[top] lg:duration-200 lg:ease-out motion-reduce:transition-none">
            {block.heading && (
              <h2 className="w-full text-headline-2xl text-on-background">{block.heading}</h2>
            )}
            {block.description && (
              <p className="w-full font-sans text-body-large leading-[1.6] text-on-background">
                {block.description}
              </p>
            )}
          </div>
        )}
        <div className="flex w-full min-w-0 flex-col items-start gap-16 lg:max-w-[668px] lg:flex-1">
          {ungrouped.length > 0 && (
            <div className="flex w-full flex-col items-start gap-6">
              <FaqRows faqs={ungrouped} />
            </div>
          )}
          {groups.map((group) => (
            <div key={group._id} className="flex w-full flex-col items-start gap-6">
              <h3 className="text-headline-base text-on-background">{group.title}</h3>
              <FaqRows faqs={group.faqs} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
