import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import ProjectPreviewView from './ProjectPreviewView'
import {BlockProps} from './types'

export default function ProjectPreview({block}: BlockProps<'projectPreview'>) {
  const href = realHref(block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null)
  const label = block.button?.buttonText ?? ''
  return (
    <ProjectPreviewView
      eyebrow={block.eyebrow}
      body={block.body}
      button={label && href ? {label, href} : null}
      projects={block.projects ?? []}
    />
  )
}
