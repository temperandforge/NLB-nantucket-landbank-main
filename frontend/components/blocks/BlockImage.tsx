import Image from '@/components/SanityImage'
import {ExtractPageBuilderType} from '@/sanity/lib/types'

type ImageValue = NonNullable<ExtractPageBuilderType<'hero'>['image']>

/**
 * A page-builder image. Renders nothing when the asset reference is missing (an image whose asset
 * was deleted comes back without one), so a block never shows a broken image.
 *
 * `fill` crops to the container (object-cover); otherwise the image keeps its own proportions.
 */
export default function BlockImage({
  image,
  width,
  sizes,
  className,
  fill = false,
}: {
  image?: ImageValue | null
  width: number
  sizes?: string
  className?: string
  fill?: boolean
}) {
  if (!image?.asset?._ref) return null
  return (
    <Image
      id={image.asset._ref}
      alt={image.alt ?? ''}
      width={width}
      hotspot={image.hotspot}
      crop={image.crop}
      mode={fill ? 'cover' : 'contain'}
      sizes={sizes}
      className={className}
    />
  )
}
