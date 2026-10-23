import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import MapPreviewView from '@/components/blocks/MapPreviewView'
import PropertiesPreviewView from '@/components/blocks/PropertiesPreviewView'
import {PropertyFaqs, PropertyGallery, PropertyIntro} from '@/components/PropertyView'
import {sanityFetch} from '@/sanity/lib/live'
import {
  morePropertiesQuery,
  propertyMapQuery,
  propertyQuery,
  propertySlugs,
  singlePropertyPageQuery,
} from '@/sanity/lib/queries'
import {orderRelatedProperties} from '@/sanity/lib/relatedProperties'
import {buildMetadata} from '@/sanity/lib/seo'
import {getSeoDefaults, resolveSeoImage} from '@/sanity/lib/seoDefaults'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

/**
 * A property page, /properties/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /properties (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: propertySlugs,
    // Only published properties are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((property) => (property.slug ? [{slug: property.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/properties/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: property} = await sanityFetch({query: propertyQuery, params: {slug}, stega: false})
  if (!property) return {}
  const description =
    property.description ||
    (property.about?.length ? toPlainText(property.about as PortableTextBlock[]).slice(0, 160) : undefined)
  return buildMetadata({
    seo: property.seo,
    title: property.name,
    description,
    image: resolveSeoImage(property.seo, property.image),
    path: `/properties/${slug}`,
    defaults: await getSeoDefaults(),
  })
}

export default async function PropertyPage(props: PageProps<'/properties/[slug]'>) {
  const {slug} = await props.params
  const [{data: property}, {data: settings}, {data: others}, {data: map}] = await Promise.all([
    sanityFetch({query: propertyQuery, params: {slug}}),
    sanityFetch({query: singlePropertyPageQuery}),
    sanityFetch({query: morePropertiesQuery, params: {slug}}),
    sanityFetch({query: propertyMapQuery}),
  ])

  // No property at this slug: a real 404, never a 200 placeholder.
  if (!property?._id) notFound()

  const more = settings?.moreProperties
  const showMore = !more?.disabled
  const count = Math.min(Math.max(more?.count ?? 3, 1), 3)
  const related = showMore
    ? orderRelatedProperties(others, property.propertyTypeIds ?? [], count)
    : []
  const buttonHref = realHref(more?.button?.link ? linkResolver(more.button.link as DereferencedLink) : null)
  const buttonLabel = more?.button?.buttonText ?? ''
  const showMap = !settings?.hideMap

  return (
    <>
      <PropertyIntro property={property} />
      <PropertyGallery property={property} />
      {showMap && (
        <MapPreviewView
          heading={property.mapHeading || `${property.name} Trails and Properties`}
          body={property.mapBody}
          properties={map.properties}
          settings={map.settings}
          focusSlug={property.slug}
          showPopupLink={false}
        />
      )}
      <PropertyFaqs property={property} settings={settings} />
      {showMore && (
        <PropertiesPreviewView
          heading={more?.heading}
          button={buttonLabel && buttonHref ? {label: buttonLabel, href: buttonHref} : null}
          properties={related}
          defaultImage={property.defaultImage}
        />
      )}
    </>
  )
}
