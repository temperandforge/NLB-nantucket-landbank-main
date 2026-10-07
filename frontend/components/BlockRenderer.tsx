import React from 'react'

import Hero from '@/components/blocks/Hero'
import HeroImage from '@/components/blocks/HeroImage'
import HeroSecondary from '@/components/blocks/HeroSecondary'
import HeroTertiary from '@/components/blocks/HeroTertiary'
import HeroVideo from '@/components/HeroVideo'
import {dataAttr} from '@/sanity/lib/utils'
import {PageBuilderSection} from '@/sanity/lib/types'

type BlockProps = {
  index: number
  block: PageBuilderSection
  pageId: string
  pageType: string
  pageName?: string
}

type BlocksType = {
  [key: string]: React.FC<BlockProps>
}

const Blocks = {
  heroVideo: HeroVideo,
  hero: Hero,
  heroImage: HeroImage,
  heroSecondary: HeroSecondary,
  heroTertiary: HeroTertiary,
} as BlocksType

/**
 * Used by the <PageBuilder>, this component renders a the component that matches the block type.
 */
export default function BlockRenderer({block, index, pageId, pageType, pageName}: BlockProps) {
  // Block does exist
  if (typeof Blocks[block._type] !== 'undefined') {
    return (
      <div
        key={block._key}
        data-sanity={dataAttr({
          id: pageId,
          type: pageType,
          path: `pageBuilder[_key=="${block._key}"]`,
        }).toString()}
      >
        {React.createElement(Blocks[block._type], {
          key: block._key,
          block: block,
          index: index,
          pageId: pageId,
          pageType: pageType,
          pageName: pageName,
        })}
      </div>
    )
  }
  // Block doesn't exist yet
  return React.createElement(
    () => (
      <div className="w-full bg-gray-100 text-center text-gray-500 p-20 rounded">
        A &ldquo;{block._type}&rdquo; block hasn&apos;t been created
      </div>
    ),
    {key: block._key},
  )
}
