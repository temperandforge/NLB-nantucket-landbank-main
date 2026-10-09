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
              className="[--rich-text-color:var(--color-on-background)] [--rich-text-size:14px]"
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
    <section className="relative flex w-full overflow-clip bg-background px-10 py-24">
      <Image
        src="/images/blocks/decorative-line-faqs.svg"
        alt=""
        aria-hidden="true"
        width={2102}
        height={284}
        className="pointer-events-none absolute top-48 left-1/2 z-0 w-[150%] max-w-none -translate-x-1/2"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[85rem] flex-col items-start gap-10 lg:flex-row lg:justify-between">
        {(block.heading || block.description) && (
          <div className="flex w-full flex-col items-start gap-6 lg:w-[318px] lg:shrink-0">
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
