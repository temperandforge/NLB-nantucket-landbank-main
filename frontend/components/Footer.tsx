import FooterMenu, {FooterInlineMenu} from '@/components/FooterMenu'
import NewsletterSignup from '@/components/NewsletterSignup'
import SocialLinks from '@/components/SocialLinks'
import {sanityFetch} from '@/sanity/lib/live'
import {footerQuery} from '@/sanity/lib/queries'
import type {FooterInfoColumnData} from '@/sanity/lib/types'

/**
 * Site footer.
 *
 * Owns only layout - the three bands and the decorative wave. What a menu item, an info line
 * or a social icon looks like belongs to the child components.
 *
 * Every band is guarded independently: a missing footer document, or a footerMenu reference
 * pointing at an unpublished menu, degrades to rendering less rather than throwing. The footer
 * appears on every page, so a content gap must never break a render.
 */

/** Tracked uppercase label - Figma type style mono/tracked (DM Mono 14, 11% tracking). */
const LABEL_CLASS = 'font-mono-tracked text-[14px] uppercase tracking-[1.54px] leading-[1.6]'

function InfoColumn({column}: {column: FooterInfoColumnData}) {
  if (!column.lines?.length) return null

  return (
    <div className="flex flex-col gap-gap-md">
      <h2 className={LABEL_CLASS}>{column.heading}</h2>
      <ul className="flex flex-col gap-gap-sm font-secondary text-body-base leading-[1.6]">
        {column.lines.map((line) => (
          <li key={line._key}>
            {/* href is optional per line, so an email or phone number can be actionable
                while an address line stays plain text. */}
            {line.href ? (
              <a
                href={line.href}
                className="transition-opacity hover:opacity-75 focus-visible:opacity-75"
              >
                {line.text}
              </a>
            ) : (
              line.text
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function Footer() {
  const {data: footer} = await sanityFetch({query: footerQuery})

  if (!footer) return null

  const {newsletterHeading, infoColumns, footerMenu, legalMenu, socialLinks, organizationName} =
    footer

  return (
    <footer className="siteFooter relative overflow-hidden bg-brand-lowlands text-warm-neutral-50">
      {/*
        Decorative wave. Reproduces the Figma structure exactly: a 4758x760 box centred on the
        footer, with the artwork bleeding past its top and left edges (inset -7.29% / -1.1%),
        which is why the SVG itself is 4810x815. Clipped by the footer's overflow-hidden.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[760px] w-[4758px] -translate-x-1/2 select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed-size,
            already-optimised SVG; the Image component would add no value here. */}
        <img
          src="/images/footer-wave.svg"
          alt=""
          className="absolute block size-full max-w-none"
          style={{inset: '-7.29% 0 0 -1.1%'}}
        />
      </div>

      <div className="relative px-6 py-section-p-sm md:px-global-margin">
        <div className="mx-auto flex max-w-site flex-col gap-gap-2xl">
          {/* Band 1: newsletter signup alongside the contact / address / hours columns. */}
          <div className="flex flex-col gap-gap-2xl xl:flex-row xl:items-start xl:justify-between">
            {newsletterHeading ? <NewsletterSignup heading={newsletterHeading} /> : null}
            {infoColumns?.length ? (
              <div className="grid grid-cols-1 gap-x-gap-lg gap-y-gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:w-[841px]">
                {infoColumns.map((column) => (
                  <InfoColumn key={column._key} column={column} />
                ))}
              </div>
            ) : null}
          </div>

          {/* Band 2 and 3: navigation, then the legal row. */}
          <div className="flex flex-col gap-gap-lg">
            <FooterMenu menu={footerMenu} />

            <div className="flex flex-col gap-gap-md md:flex-row md:items-end md:justify-between">
              <p className="font-secondary text-body-small leading-[1.6]">
                Copyright © {new Date().getFullYear()} {organizationName}
              </p>
              <div className="flex flex-col gap-gap-md sm:flex-row sm:items-end">
                <FooterInlineMenu menu={legalMenu} />
                <SocialLinks links={socialLinks} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
