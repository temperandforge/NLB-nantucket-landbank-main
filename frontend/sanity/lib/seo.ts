import type {Metadata} from 'next'

import {absoluteUrl} from './siteUrl'

/** An image already resolved for a social card (see `resolveOpenGraphImage`). */
export type SeoImage = {url: string; alt: string; width: number; height: number}

/** The per-document override object, as stored. Every field is optional. */
export type SeoOverride = {
  title?: string | null
  description?: string | null
  noIndex?: boolean | null
} | null

/** Site-wide fallbacks, gathered once from Settings (see `getSeoDefaults`). */
export type SeoDefaults = {
  origin: string | null
  siteName?: string | null
  description?: string | null
  image?: SeoImage | null
}

type BuildMetadataInput = {
  /** The document's `seo` override. */
  seo?: SeoOverride
  /** What the route would show with no override: the document's name or title. */
  title?: string | null
  description?: string | null
  /** The document's `seo.image`, then its own image, already resolved. */
  image?: SeoImage | null
  /** Site-relative path of this page, beginning with `/`. The canonical is derived from it. */
  path: string
  type?: 'website' | 'article'
  defaults?: SeoDefaults
}

const clean = (value: string | null | undefined) => value?.trim() || undefined

/**
 * Precedence for each field: the document's `seo` override, then what the route derived from the
 * document, then the site defaults. A key with no value is left out rather than set to undefined,
 * so Next renders no empty tag. A page that sets `openGraph` replaces the layout's wholesale, so
 * the default image is repeated here.
 */
export function buildMetadata({
  seo,
  title,
  description,
  image,
  path,
  type = 'website',
  defaults,
}: BuildMetadataInput): Metadata {
  const resolvedTitle = clean(seo?.title) ?? clean(title)
  const resolvedDescription = clean(seo?.description) ?? clean(description) ?? clean(defaults?.description)
  const resolvedImage = image ?? defaults?.image ?? undefined
  const canonical = absoluteUrl(path, defaults?.origin ?? null)
  const siteName = clean(defaults?.siteName)

  const metadata: Metadata = {}
  // A search title typed by an editor is the whole title: the layout's "| Site" suffix would
  // otherwise double a site name they included on purpose.
  if (clean(seo?.title)) metadata.title = {absolute: clean(seo?.title) as string}
  else if (resolvedTitle) metadata.title = resolvedTitle
  if (resolvedDescription) metadata.description = resolvedDescription
  if (canonical) metadata.alternates = {canonical}
  if (seo?.noIndex) metadata.robots = {index: false, follow: true}

  metadata.openGraph = {
    type,
    ...(resolvedTitle && {title: resolvedTitle}),
    ...(resolvedDescription && {description: resolvedDescription}),
    ...(canonical && {url: canonical}),
    ...(siteName && {siteName}),
    ...(resolvedImage && {images: [resolvedImage]}),
  }
  metadata.twitter = {
    card: resolvedImage ? 'summary_large_image' : 'summary',
    ...(resolvedTitle && {title: resolvedTitle}),
    ...(resolvedDescription && {description: resolvedDescription}),
    ...(resolvedImage && {images: [resolvedImage.url]}),
  }
  return metadata
}
