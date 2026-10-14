import {MapboxMap} from '@/components/map/MapboxMap'
import type {MapSettings, Property} from '@/components/map/types'

/**
 * The Map Preview markup: a heading and intro over the live map, with scroll-zoom off. Used by the
 * Map Preview block and by the property page.
 */
export default function MapPreviewView({
  heading,
  body,
  properties,
  settings,
}: {
  heading?: string | null
  body?: string | null
  properties: Property[]
  settings: MapSettings | null
}) {
  return (
    <section className="w-full bg-background tf-px py-s6">
      <div className="tf-max-w flex flex-col gap-12 text-on-background md:gap-10">
        <div className="flex flex-col gap-5 md:flex-row md:justify-between md:gap-10">
          {heading && <h2 className="text-headline-xl md:w-[504px] md:shrink-0">{heading}</h2>}
          {body && (
            <p className="font-sans text-body-base leading-[1.6] md:w-[668px] md:shrink-0">{body}</p>
          )}
        </div>
        <div className="relative h-[420px] w-full overflow-clip rounded-[4px] md:h-[738px]">
          <MapboxMap projects={properties} settings={settings} scrollZoom={false} />
        </div>
      </div>
    </section>
  )
}
