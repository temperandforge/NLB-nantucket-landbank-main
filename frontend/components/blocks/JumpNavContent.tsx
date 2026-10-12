import {stegaClean, type PortableTextBlock} from 'next-sanity'

import JumpNavLayout from '@/components/JumpNavLayout'
import CustomPortableText from '@/components/PortableText'
import {buildJumpNav} from '@/sanity/lib/jumpNav'

import {BlockProps} from './types'

export default function JumpNavContent({block}: BlockProps<'jumpNavContent'>) {
  // stegaClean: see BasicLeftRightText.
  const headingLevel = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'
  const content = block.content ?? []
  const {items, idByKey} = buildJumpNav(content)

  return (
    <section className="w-full">
      <JumpNavLayout
        heading={block.heading}
        headingLevel={headingLevel}
        navLabel={block.heading || 'Section navigation'}
        items={items}
      >
        {content.length > 0 && (
          <CustomPortableText value={content as PortableTextBlock[]} sectionIds={idByKey} />
        )}
      </JumpNavLayout>
    </section>
  )
}
