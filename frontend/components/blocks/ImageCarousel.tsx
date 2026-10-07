import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function ImageCarousel({block}: BlockProps<'imageCarousel'>) {
  const images = block.images?.filter((item) => item.image?.asset?._ref) ?? []
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-4">{block.eyebrow}</Eyebrow>}
        {images.length > 0 && (
          <div
            className="image-carousel__track flex gap-6 overflow-x-auto"
            role="region"
            aria-label={block.eyebrow || 'Image carousel'}
            tabIndex={0}
          >
            {images.map((item) => (
              <figure key={item._key} className="image-carousel__slide flex-none w-80 m-0">
                <BlockImage image={item.image} width={640} sizes="320px" className="w-full rounded" />
                {item.caption && (
                  <figcaption className="text-sm text-moody-moor-700 mt-2">{item.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
