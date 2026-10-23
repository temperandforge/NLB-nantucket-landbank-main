import Image from 'next/image'
import {ViewTransition} from 'react'
import type {PortableTextBlock} from 'next-sanity'

import Cascade from '@/components/Cascade'
import BlockImage from '@/components/blocks/BlockImage'
import FaqItem from '@/components/blocks/FaqItem'
import ImageCarouselSlide from '@/components/blocks/ImageCarouselSlide'
import ImageCarouselTrack from '@/components/blocks/ImageCarouselTrack'
import CustomPortableText from '@/components/PortableText'
import LinkRow from '@/components/ui/LinkRow'
import Tag from '@/components/ui/Tag'
import type {PropertyQueryResult, SinglePropertyPageQueryResult} from '@/sanity.types'

/**
 * The top of a property page (Figma: property_template_desktop / _mobile): the hero image; the name
 * and type tags beside the About text (its heading, if any, is authored) and a Directions link; then the
 * gallery carousel and the property's FAQs. The map and the "more properties" section are composed
 * by the route. Everything but the name is optional and simply absent when missing.
 */
export function PropertyIntro({property}: {property: NonNullable<PropertyQueryResult>}) {
  const hero = property.image?.asset?._ref ? property.image : property.defaultImage
  const tags = (property.propertyTypes ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )

  // Directions, built from the map marker; no marker, no link.
  const {lat, lng} = property.location ?? {}
  const directionsHref =
    typeof lat === 'number' && typeof lng === 'number'
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null

  return (
    <>
      {hero && (
        <div className="w-full bg-background tf-px py-5 md:py-10">
          {/* The archive card's image morphs into this (CardProperty `morph`). */}
          <ViewTransition name={`property-${property.slug}`} share="morph" default="none">
            <div data-morph className="relative h-[523px] w-full overflow-clip rounded bg-dusty-heath-800 md:h-[600px]">
              <BlockImage
                image={hero}
                width={2400}
                sizes="100vw"
                fill
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          </ViewTransition>
        </div>
      )}
      <article className="relative w-full overflow-clip bg-background tf-px py-s6">
        <div className="basic-left-right__lines pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
        <div className="relative z-10 flex w-full flex-col gap-16 tf-max-w md:flex-row md:items-start md:justify-between md:gap-20">
          <div className="flex w-full flex-col items-start gap-10 md:max-w-[553px] md:flex-1">
            <Cascade as="h1" className="w-full text-headline-xl text-on-background text-balance" text={property.name} />
            {tags.length > 0 && (
              <div className="flex flex-wrap items-start gap-2 load-in">
                {tags.map((tag) => (
                  <Tag key={tag.key} label={tag.label} />
                ))}
              </div>
            )}
          </div>
          <div className="flex w-full flex-col items-start gap-12 md:max-w-[668px] md:flex-1 md:gap-16">
            {property.about && (
              // The "About" heading, if any, is the editor's own (Heading 2).
              <CustomPortableText
                variant="basic"
                className="w-full"
                value={property.about as PortableTextBlock[]}
              />
            )}
            {directionsHref && (
              <LinkRow label="Directions" href={directionsHref} icon="link" newTab />
            )}
          </div>
        </div>
      </article>
    </>
  )
}

/** The gallery carousel (Figma: Image Carousel), under a tag naming the property. */
export function PropertyGallery({property}: {property: NonNullable<PropertyQueryResult>}) {
  const images = (property.gallery ?? []).filter((image) => image.asset?._ref)
  if (images.length === 0) return null
  const label = `${property.name} Property and Recreation`
  return (
    <section className="w-full overflow-x-clip bg-background py-s6">
      <div className="flex w-full flex-col items-center gap-16">
        <div className="flex items-center justify-center rounded bg-tag px-2 py-1">
          <span className="tag-label">{label}</span>
        </div>
        <ImageCarouselTrack label={label}>
          {images.map((image) => (
            <ImageCarouselSlide
              key={image._key}
              image={{...image, hotspot: image.hotspot ?? undefined, crop: image.crop ?? undefined}}
              label={image.caption}
            />
          ))}
        </ImageCarouselTrack>
      </div>
    </section>
  )
}

/** The property's FAQs (Figma: Property FAQs). Absent when the property has none. */
export function PropertyFaqs({
  property,
  settings,
}: {
  property: NonNullable<PropertyQueryResult>
  settings: SinglePropertyPageQueryResult
}) {
  // A reference to an unpublished FAQ dereferences to null.
  const faqs = (property.faqs ?? []).filter((faq) => faq?.question)
  if (faqs.length === 0) return null
  const copy = settings?.faqs
  return (
    <section className="relative flex w-full overflow-clip bg-background tf-px py-s6">
      <Image
        src="/images/blocks/decorative-line-faqs.svg"
        alt=""
        aria-hidden="true"
        width={2102}
        height={284}
        className="pointer-events-none absolute top-48 left-1/2 z-0 w-[150%] max-w-none -translate-x-1/2"
      />
      <div className="relative z-10 flex w-full flex-col items-start gap-10 tf-max-w lg:flex-row lg:justify-between">
        <div className="flex w-full flex-col items-start gap-5 lg:w-[365px] lg:shrink-0 lg:gap-6">
          {copy?.eyebrow && (
            <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
              {copy.eyebrow}
            </p>
          )}
          {copy?.heading && (
            <h2 className="w-full text-headline-xl text-on-background">{copy.heading}</h2>
          )}
          {copy?.description && (
            <p className="w-full font-sans text-body-large leading-[1.6] text-on-background">
              {copy.description}
            </p>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-col items-start gap-5 lg:max-w-[668px] lg:flex-1">
          {faqs.map((faq) => (
            <FaqItem key={faq._id} question={faq.question ?? ''}>
              {faq.answer && (
                <CustomPortableText
                  variant="basic"
                  className="[--rich-text-color:var(--color-on-surface-dark)]"
                  value={faq.answer as PortableTextBlock[]}
                />
              )}
            </FaqItem>
          ))}
        </div>
      </div>
    </section>
  )
}
