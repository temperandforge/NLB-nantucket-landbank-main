import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import NewsPreviewView from './NewsPreviewView'
import {BlockProps} from './types'

export default function NewsPreview({block}: BlockProps<'newsPreview'>) {
  return (
    <NewsPreviewView
      heading={block.heading}
      articles={(block.articles ?? []).slice(0, block.count ?? 2)}
      cta={{
        heading: block.ctaHeading,
        label: block.ctaLabel,
        href: realHref(block.ctaLink ? linkResolver(block.ctaLink as DereferencedLink) : null),
      }}
    />
  )
}
