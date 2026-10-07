import {BlockProps} from './types'

export default function MapTeaser({block}: BlockProps<'mapTeaser'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.heading && <h2 className="text-headline-base mb-4">{block.heading}</h2>}
        {block.body && <p className="text-moody-moor-600 max-w-[42rem]">{block.body}</p>}
        <div className="mt-6 h-80 bg-dusty-heath-900 rounded" aria-hidden="true" />
      </div>
    </section>
  )
}
