import {stegaClean, type PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import {buildJumpNav} from '@/sanity/lib/jumpNav'

import {BlockProps} from './types'

export default function JumpNavContent({block}: BlockProps<'jumpNavContent'>) {
  // stegaClean: see BasicLeftRightText.
  const Heading = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'
  const content = block.content ?? []
  const {items, idByKey} = buildJumpNav(content)

  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-24">
        <div className="md:sticky md:top-[calc(var(--header-height)+2.5rem)] self-start">
          {block.heading && <Heading className="text-headline-2xl mb-8">{block.heading}</Heading>}
          {items.length > 0 && (
            <nav className="flex flex-col" aria-label={block.heading || 'Section navigation'}>
              {items.map((item) => (
                <a
                  key={item.id}
                  className="flex items-center justify-between py-4 border-b border-dusty-heath-800 no-underline text-moody-moor-600"
                  href={`#${item.id}`}
                >
                  <span>{item.text}</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              ))}
            </nav>
          )}
        </div>
        <div className="flex flex-col gap-10">
          {content.length > 0 && (
            <CustomPortableText value={content as PortableTextBlock[]} sectionIds={idByKey} />
          )}
        </div>
      </div>
    </section>
  )
}
