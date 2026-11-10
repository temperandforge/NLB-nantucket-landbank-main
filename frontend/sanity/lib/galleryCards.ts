import {articleHref, eventHref, projectHref} from './routes.ts'

/**
 * The cards of a property's gallery carousel. An entry is either an uploaded image, which opens
 * full size in a lightbox, or a related document (news, project or event), which shows
 * the document's image and title and links to its page. A pure function so a script can check it;
 * the page passes it the gallery field as the query returns it.
 *
 * An entry that cannot be a card is dropped, never shown empty: an image with no file, a document
 * that was unpublished (it dereferences to null), has no title, has nothing to link to, or has no
 * image. The image comes from the document's own `image`, then its SEO image, then the first image
 * in its body, so a document that only lacks a cover can still appear.
 */

type Asset = {_ref?: string} | null | undefined

export type CardImage = {
  asset?: Asset
  hotspot?: unknown
  crop?: unknown
  alt?: string | null
}

export type GalleryEntry = {
  // Array members always have a key; the generated type just doesn't say so for a reference.
  _key: string | null
  _type: string
  // An uploaded image.
  asset?: Asset
  hotspot?: unknown
  crop?: unknown
  alt?: string | null
  caption?: string | null
  // A related document, dereferenced by the query.
  doc?: {
    docType?: string | null
    title?: string | null
    slug?: string | null
    externalUrl?: string | null
    image?: CardImage | null
  } | null
}

export type GalleryCard = {
  key: string
  image: CardImage
  label: string | null
  /** Where the card goes. Absent for an uploaded image, which opens a lightbox instead. */
  href: string | null
  external: boolean
  lightbox: boolean
}

const hasAsset = (image: CardImage | null | undefined): image is CardImage =>
  Boolean(image?.asset?._ref)

/** A real http(s) address, or null: `#` and an empty string mean "no link yet" (see realHref). */
function externalAddress(value: string | null | undefined): string | null {
  const url = value?.trim()
  return url && /^https?:\/\//i.test(url) ? url : null
}

function documentHref(
  doc: NonNullable<GalleryEntry['doc']>,
): {href: string; external: boolean} | null {
  const slug = doc.slug?.trim()
  switch (doc.docType) {
    case 'article':
    case 'project':
    case 'event': {
      const own = externalAddress(doc.externalUrl)
      if (own) return {href: own, external: true}
      if (!slug) return null
      const pageHref = {article: articleHref, project: projectHref, event: eventHref}[doc.docType]
      return {href: pageHref(slug), external: false}
    }
    default:
      return null
  }
}

export function galleryCards(entries: GalleryEntry[] | null | undefined): GalleryCard[] {
  return (entries ?? []).flatMap((entry, index): GalleryCard[] => {
    const key = entry._key ?? `entry-${index}`
    if (entry._type === 'relatedDocument' || entry._type === 'reference') {
      const doc = entry.doc
      const title = doc?.title?.trim()
      const target = doc ? documentHref(doc) : null
      if (!doc || !title || !target || !hasAsset(doc.image)) return []
      return [
        {
          key,
          image: {...doc.image, alt: doc.image.alt || title},
          label: title,
          href: target.href,
          external: target.external,
          lightbox: false,
        },
      ]
    }
    if (!entry.asset?._ref) return []
    return [
      {
        key,
        image: {asset: entry.asset, hotspot: entry.hotspot, crop: entry.crop, alt: entry.alt},
        label: entry.caption?.trim() || null,
        href: null,
        external: false,
        lightbox: true,
      },
    ]
  })
}
