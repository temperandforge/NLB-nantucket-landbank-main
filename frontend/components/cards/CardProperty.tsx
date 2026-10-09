import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import {realHref} from '@/sanity/lib/utils'

import type {PropertyDefaultImage, PropertyItem} from './types'

/**
 * A property on the archive (Figma: image, name, type tags, a two-line description). The image
 * area sits on the neutral background the staff cards use, so a property with no image of its own
 * and no site default still holds its height.
 */
export default function CardProperty({
  property,
  defaultImage,
}: {
  property: PropertyItem
  defaultImage: PropertyDefaultImage
}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = (property.propertyTypes ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const image = property.image?.asset?._ref ? property.image : defaultImage
  const card = (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="relative h-[370px] w-full shrink-0 overflow-hidden rounded bg-on-background-tonal">
        <BlockImage
          image={image}
          width={900}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          fill
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <p className="w-full break-words text-headline-base leading-[1.1] tracking-normal text-on-background">
          {property.name}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
        {property.description && (
          <p className="line-clamp-2 w-full font-sans text-body-base leading-[1.6] text-on-background">
            {property.description}
          </p>
        )}
      </div>
    </div>
  )
  // The property's own link, when it has one; otherwise a plain card, never a dead anchor.
  const href = realHref(property.link)
  return href ? (
    <a href={href} className="block w-full">
      {card}
    </a>
  ) : (
    card
  )
}
