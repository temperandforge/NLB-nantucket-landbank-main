import MapPreviewView from './MapPreviewView'
import {BlockProps} from './types'

/** The Map Preview block: a heading and intro over the live map, with scroll-zoom off. */
export default function MapPreview({block}: BlockProps<'mapPreview'>) {
  return (
    <MapPreviewView
      heading={block.heading}
      body={block.body}
      properties={block.properties ?? []}
      settings={block.settings}
    />
  )
}
