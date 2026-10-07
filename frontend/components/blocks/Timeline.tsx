import TimelineTrack from './TimelineTrack'
import {BlockProps} from './types'

export default function Timeline({block}: BlockProps<'timeline'>) {
  const entries = block.entries ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {entries.length > 0 && (
          <TimelineTrack>
            {entries.map((entry) => (
              <li key={entry._key} className="flex-none w-56 border-l border-dusty-heath-600 pl-3">
                <span className="block text-h3">{entry.year}</span>
                <h3 className="text-h6 my-2">{entry.title}</h3>
                {entry.description && <p className="text-moody-moor-600">{entry.description}</p>}
              </li>
            ))}
          </TimelineTrack>
        )}
      </div>
    </section>
  )
}
