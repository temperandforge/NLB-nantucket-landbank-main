import TimelineSlider, {type TimelineEvent} from './TimelineSlider'
import {BlockProps} from './types'

/**
 * Connector-line heights reproduce the Figma design's organic, non-uniform rhythm. Derived from
 * the entry's position (cycling), never authored or stored.
 */
const LINE_LENGTHS = [220, 333, 239, 279, 184, 301, 210, 349, 197, 265]

export default function Timeline({block}: BlockProps<'timeline'>) {
  const events: TimelineEvent[] = (block.entries ?? []).map((entry, index) => ({
    year: entry.year,
    title: entry.title,
    description: entry.description ?? '',
    lineLength: LINE_LENGTHS[index % LINE_LENGTHS.length],
  }))
  if (events.length === 0) return null
  return <TimelineSlider events={events} />
}
