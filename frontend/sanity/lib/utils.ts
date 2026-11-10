import {Link} from '@/sanity.types'
import {dataset, projectId, studioUrl} from '@/sanity/lib/api'
import {createDataAttribute, CreateDataAttributeProps, stegaClean} from 'next-sanity'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import {DereferencedLink} from '@/sanity/lib/types'

const builder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

// Create an image URL builder using the client
// Export a function that can be used to get image URLs
function urlForImage(source: SanityImageSource) {
  return builder.image(source)
}

export function resolveOpenGraphImage(
  image?: SanityImageSource | null,
  width = 1200,
  height = 627,
) {
  if (!image) return
  const url = urlForImage(image)?.width(1200).height(627).fit('crop').url()
  if (!url) return
  return {url, alt: (image as {alt?: string})?.alt || '', width, height}
}

// Depending on the type of link, we need to fetch the corresponding page or URL.  Otherwise return null.
/**
 * A tile or card links only to a real destination. `#` is the placeholder convention for a link
 * whose path is not known yet (menus keep it), so a tile treats it, and an empty value, as no link
 * rather than rendering an anchor that goes nowhere.
 */
export function realHref(href: string | null | undefined): string | null {
  const value = href ? stegaClean(href).trim() : ''
  return value && value !== '#' ? value : null
}

/**
 * Where a tile for a news article, event, project or property goes: its own external URL when
 * the editor set one (a page on another site), otherwise its page, derived from the slug.
 */
export function singleHref(
  externalUrl: string | null | undefined,
  slug: string | null | undefined,
  pageHref: (slug: string) => string,
): string | null {
  return realHref(externalUrl) ?? (slug ? pageHref(slug) : null)
}

export function linkResolver(link: Link | DereferencedLink | undefined) {
  if (!link) return null

  // If linkType is not set but href is, lets set linkType to "href".  This comes into play when pasting links into the portable text editor because a link type is not assumed.
  if (!link.linkType && link.href) {
    link.linkType = 'href'
  }

  switch (link.linkType) {
    case 'href':
      return link.href || null
    case 'page':
      if (link?.page && typeof link.page === 'string') {
        return `/${link.page}`
      }
    default:
      return null
  }
}

type DataAttributeConfig = CreateDataAttributeProps &
  Required<Pick<CreateDataAttributeProps, 'id' | 'type' | 'path'>>

export function dataAttr(config: DataAttributeConfig) {
  return createDataAttribute({
    projectId,
    dataset,
    baseUrl: studioUrl,
  }).combine(config)
}

// Addresses of the document types that live at a fixed route (see routes.ts).
export {articleHref, eventHref, projectHref, propertyHref} from '@/sanity/lib/routes'
