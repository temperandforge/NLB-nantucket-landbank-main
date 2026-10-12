import {BlockProps} from './types'
import GrowersGrid from './GrowersGrid'

/** The Growers block: a heading and intro above a two-column grid of growers. */
export default function Growers({block}: BlockProps<'growers'>) {
  const growers = (block.growers ?? []).flatMap((grower) =>
    grower.name ? [{...grower, name: grower.name}] : [],
  )

  return (
    <section className="w-full bg-background tf-px py-12 md:py-24">
      <div className="tf-max-w flex flex-col items-center gap-12 text-on-background md:gap-24">
        <div className="flex w-full flex-col gap-8 md:flex-row md:justify-between md:gap-10">
          {block.heading && <h2 className="text-headline-xl">{block.heading}</h2>}
          {block.body && (
            <p className="font-sans text-body-base leading-[1.6] md:w-[534px] md:shrink-0">
              {block.body}
            </p>
          )}
        </div>
        <GrowersGrid growers={growers} />
      </div>
    </section>
  )
}
