import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroImage({block}: BlockProps<'heroImage'>) {
  return (
    <section className="relative overflow-hidden w-full min-h-[34.0625rem] md:min-h-[41.875rem]">
      <BlockImage
        image={block.image}
        width={1920}
        sizes="100vw"
        fill
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="pt-gap-lg pb-section-p-xl relative tf-px">
        <div className="tf-max-w">
          <div className="relative overflow-hidden rounded bg-warm-neutral-50 p-6 min-h-[24.0625rem] w-full md:w-[43.25rem] flex flex-col justify-between">
            <div className="hero-image__lines absolute inset-0 pointer-events-none" aria-hidden="true" />
            {block.eyebrow && (
              <Eyebrow className="relative z-10 text-moody-moor-600">{block.eyebrow}</Eyebrow>
            )}
            {block.heading && (
              <h1 className="relative z-10 text-h2 text-moody-moor-600">{block.heading}</h1>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
