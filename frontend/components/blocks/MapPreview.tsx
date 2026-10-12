import {MapboxMap} from '@/app/map/MapboxMap'

import {BlockProps} from './types'

/** The Map Preview block: a heading and intro over the live map, with scroll-zoom off. */
export default function MapPreview({block}: BlockProps<'mapPreview'>) {
  return (
    <section className="w-full bg-background tf-px py-s6">
      <div className="tf-max-w flex flex-col gap-12 text-on-background md:gap-10">
        <div className="flex flex-col gap-5 md:flex-row md:justify-between md:gap-10">
          {block.heading && (
            <h2 className="text-headline-xl md:w-[504px] md:shrink-0">{block.heading}</h2>
          )}
          {block.body && (
            <p className="font-sans text-body-base leading-[1.6] md:w-[668px] md:shrink-0">
              {block.body}
            </p>
          )}
        </div>
        <div className="relative h-[420px] w-full overflow-clip rounded-[4px] md:h-[738px]">
          <MapboxMap projects={block.properties ?? []} settings={block.settings} scrollZoom={false} />
        </div>
      </div>
    </section>
  )
}
