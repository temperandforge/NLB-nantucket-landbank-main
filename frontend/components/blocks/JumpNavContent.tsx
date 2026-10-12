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
    <section className="relative w-full overflow-clip bg-background">
      <div
        className="project-curve pointer-events-none absolute left-1/2 top-[40%] h-[1089px] w-[1684px] max-w-none -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <JumpNavLayout
        variant="project"
        heading={block.heading}
        headingLevel={headingLevel}
        navLabel={block.heading || 'Section navigation'}
        items={items}
      >
        {content.length > 0 && (
          <CustomPortableText
            variant="project"
            className="w-full"
            value={content as PortableTextBlock[]}
            sectionIds={idByKey}
          />
        )}
      </JumpNavLayout>
    </section>
  )
}
