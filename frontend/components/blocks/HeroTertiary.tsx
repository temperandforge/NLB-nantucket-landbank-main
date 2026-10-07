import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function HeroTertiary({block}: BlockProps<'heroTertiary'>) {
  return (
    <section className="w-full overflow-hidden">
      <div className="relative py-section-p-sm tf-px">
        <div className="tf-max-w">
          <div className="hero-tertiary__lines absolute inset-0 -z-10" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-6 lg:grid lg:gap-6 lg:grid-cols-12 lg:items-center">
            <div className="flex flex-col gap-6 lg:col-span-5">
              {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-0">{block.eyebrow}</Eyebrow>}
              {block.heading && <h1 className="text-h1 mb-0 text-moody-moor-500">{block.heading}</h1>}
            </div>
            {block.body && (
              <p className="text-moody-moor-600 lg:col-span-6 lg:col-start-7">{block.body}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
