import EventsPreviewView from './EventsPreviewView'
import {BlockProps} from './types'

export default function EventsPreview({block}: BlockProps<'eventsPreview'>) {
  return <EventsPreviewView eyebrow={block.eyebrow} events={(block.events ?? []).slice(0, block.count ?? 2)} />
}
