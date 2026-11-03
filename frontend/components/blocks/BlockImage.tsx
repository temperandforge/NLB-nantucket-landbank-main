import Image from '@/components/SanityImage'
import type {SanityImageCrop, SanityImageHotspot} from '@/sanity.types'

type ImageValue = {
  asset?: {_ref?: string} | null
  hotspot?: SanityImageHotspot
  crop?: SanityImageCrop
  alt?: string | null
}

/**
 * A page-builder image. Renders nothing when the asset reference is missing (an image whose asset
 * was deleted comes back without one), so a block never shows a broken image.
 *
 * `fill` crops to the container (object-cover); otherwise the image keeps its own proportions.
 *
 * Images lazy-load by default. `priority` is for the one image a page leads with (a hero): it is
 * fetched first and never lazy, because that image is almost always the Largest Contentful Paint
 * and a lazy, low-priority LCP image is what Lighthouse flags as "LCP request discovery".
 */
export default function BlockImage({
  image,
  width,
  sizes,
  className,
  fill = false,
  priority = false,
}: {
  image?: ImageValue | null
  width: number
  sizes?: string
  className?: string
  fill?: boolean
  priority?: boolean
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
      {...(priority ? {loading: 'eager' as const, fetchPriority: 'high' as const} : {})}
    />
  )
}
