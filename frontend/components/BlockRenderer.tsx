import React from 'react'

import BasicLeftRightText from '@/components/blocks/BasicLeftRightText'
import Hero from '@/components/blocks/Hero'
import CtaContact from '@/components/blocks/CtaContact'
import EventsPreview from '@/components/blocks/EventsPreview'
import NewsPreview from '@/components/blocks/NewsPreview'
import NewsArchive from '@/components/blocks/NewsArchive'
import FaqList from '@/components/blocks/FaqList'
import JobListings from '@/components/blocks/JobListings'
import PeopleGrid from '@/components/blocks/PeopleGrid'
import ProjectGrid from '@/components/blocks/ProjectGrid'
import ProjectPreview from '@/components/blocks/ProjectPreview'
import PropertyArchive from '@/components/blocks/PropertyArchive'
import MissionStatement from '@/components/blocks/MissionStatement'
import ContactForm from '@/components/blocks/ContactForm'
import DownloadBlock from '@/components/blocks/DownloadBlock'
import MapTeaser from '@/components/blocks/MapTeaser'
import JumpNavContent from '@/components/blocks/JumpNavContent'
import ImageCarousel from '@/components/blocks/ImageCarousel'
import Timeline from '@/components/blocks/Timeline'
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
  basicLeftRightText: BasicLeftRightText,
  jumpNavContent: JumpNavContent,
  imageCarousel: ImageCarousel,
  timeline: Timeline,
  downloadBlock: DownloadBlock,
  mapTeaser: MapTeaser,
  contactForm: ContactForm,
  ctaContact: CtaContact,
  missionStatement: MissionStatement,
  newsPreview: NewsPreview,
  newsArchive: NewsArchive,
  eventsPreview: EventsPreview,
  faqList: FaqList,
  jobListings: JobListings,
  peopleGrid: PeopleGrid,
  projectGrid: ProjectGrid,
  projectPreview: ProjectPreview,
  propertyArchive: PropertyArchive,
} as BlocksType

/**
 * Used by the <PageBuilder>, this component renders a the component that matches the block type.
 */
export default function BlockRenderer({block, index, pageId, pageType, pageName}: BlockProps) {
  // Block does exist
  if (typeof Blocks[block._type] !== 'undefined') {
    // Only reaches here for a hidden block in draft mode: the query drops it everywhere else.
    const hidden = Boolean(block.disabled)
    return (
      <div
        key={block._key}
        className={hidden ? 'relative' : undefined}
        data-sanity={dataAttr({
          id: pageId,
          type: pageType,
          path: `pageBuilder[_key=="${block._key}"]`,
        }).toString()}
      >
        {hidden && (
          <span className="absolute left-3 top-3 z-50 rounded bg-black/75 px-2 py-1 font-mono text-xs uppercase tracking-widest text-white">
            Hidden
          </span>
        )}
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
