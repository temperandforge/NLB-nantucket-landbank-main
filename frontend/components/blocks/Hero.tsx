import Cascade from '@/components/Cascade'
import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function Hero({block}: BlockProps<'hero'>) {
  return (
    <section className="w-full tf-px">
      <div className="tf-max-w py-s6 text-center">
        {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-3 load-in">{block.eyebrow}</Eyebrow>}
        {block.heading && <Cascade as="h1" className="text-headline-2xl mb-6" text={block.heading} />}
        {block.body && <p className="text-moody-moor-600 max-w-[42rem] mx-auto load-in">{block.body}</p>}
        <BlockImage
          image={block.image}
          width={1360}
          sizes="(min-width: 1360px) 1360px, 100vw"
          priority
          className="w-full rounded mt-10"
        />
      </div>
    </section>
  )
}
