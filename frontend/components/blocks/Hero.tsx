import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function Hero({block}: BlockProps<'hero'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-24 text-center">
        {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-3">{block.eyebrow}</Eyebrow>}
        {block.heading && <h1 className="text-h1 mb-6">{block.heading}</h1>}
        {block.body && <p className="text-moody-moor-600 max-w-[42rem] mx-auto">{block.body}</p>}
        <BlockImage
          image={block.image}
          width={1360}
          sizes="(min-width: 1360px) 1360px, 100vw"
          className="w-full rounded mt-10"
        />
      </div>
    </section>
  )
}
