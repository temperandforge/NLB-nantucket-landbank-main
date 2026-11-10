import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import EventsPreviewView from './EventsPreviewView'
import {BlockProps} from './types'

/** The most events the preview shows, however many the editor asks for. */
const MAX_EVENTS = 6

export default function EventsPreview({block}: BlockProps<'eventsPreview'>) {
  const href = realHref(block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null)
  const label = block.button?.buttonText ?? ''
  return (
    <EventsPreviewView
      eyebrow={block.eyebrow}
      events={(block.events ?? []).slice(0, Math.min(block.count ?? 2, MAX_EVENTS))}
      hideWhenEmpty={block.hideWhenEmpty ?? true}
      button={label && href ? {label, href} : null}
    />
  )
}
