import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import PropertiesPreviewView from './PropertiesPreviewView'
import {BlockProps} from './types'

/** The Properties Preview block: its authored heading, button and properties. */
export default function PropertiesPreview({block}: BlockProps<'propertiesPreview'>) {
  const href = realHref(block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null)
  const label = block.button?.buttonText ?? ''
  return (
    <PropertiesPreviewView
      heading={block.heading}
      button={label && href ? {label, href} : null}
      properties={block.properties ?? []}
      defaultImage={block.defaultImage}
    />
  )
}
