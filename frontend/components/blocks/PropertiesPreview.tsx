import CardProperty from '@/components/cards/CardProperty'
import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import {BlockProps} from './types'

/**
 * Properties Preview (Figma: Properties Preview): a heading and a button above up to three
 * property cards, in a row from 1024px and stacked below it.
 */
export default function PropertiesPreview({block}: BlockProps<'propertiesPreview'>) {
  // A reference to an unpublished property dereferences to null.
  const properties = (block.properties ?? []).filter((property) => property?.name)
  const href = realHref(block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null)
  const label = block.button?.buttonText ?? ''
  const hasButton = Boolean(label && href)
  if (!block.heading && !hasButton && properties.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-8 tf-max-w md:gap-10">
        {(block.heading || hasButton) && (
          <div className="flex w-full flex-col items-start gap-8 md:flex-row md:justify-between">
            {block.heading && (
              <h2 className="m-0 max-w-[434px] text-headline-lg leading-[1.1] text-on-background">
                {block.heading}
              </h2>
            )}
            {hasButton && <ButtonLink label={label} href={href!} rightIcon className="shrink-0" />}
          </div>
        )}
        {properties.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-8 p-0 md:gap-10 lg:grid-cols-3 lg:gap-3">
            {properties.map((property) => (
              <li key={property._id}>
                <CardProperty property={property} defaultImage={block.defaultImage} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
