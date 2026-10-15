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

/** Tracked uppercase label - Figma type style mono/tracked (DM Mono 14, tracking-wide). */
const LABEL_CLASS = 'font-mono-tracked text-body-small uppercase tracking-wide leading-[1.6]'

function InfoColumn({column}: {column: FooterInfoColumnData}) {
  if (!column.lines?.length) return null

  return (
    <div className="flex flex-col gap-5 md:gap-gap-md">
      <h2 className={LABEL_CLASS}>{column.heading}</h2>
      <ul className="flex flex-col gap-2 font-secondary text-body-base leading-[1.6] opacity-75 md:gap-gap-sm">
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

  const {
    newsletterHeading,
    newsletterForm,
    infoColumns,
    footerMenu,
    legalMenu,
    socialLinks,
    organizationName,
  } = footer

  return (
    <footer className="siteFooter relative overflow-hidden bg-lowlands-500 text-on-accent-primary">
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

      <div className="relative px-5 pt-10 pb-12 md:px-global-margin md:py-section-p-sm">
        <div className="flex flex-col gap-20 md:gap-gap-2xl">
          {/* Band 1: newsletter signup alongside the contact / address / hours columns. */}
          <div className="flex flex-col gap-20 md:gap-gap-2xl xl:flex-row xl:items-start xl:justify-between">
            {/* Below md the design puts the social icons under the signup form; from md they
                sit in the legal row. One set of links per breakpoint, the other is display:none. */}
            <div className="flex flex-col gap-8 md:block">
              {newsletterHeading ? (
                <NewsletterSignup heading={newsletterHeading} form={newsletterForm} />
              ) : null}
              <SocialLinks links={socialLinks} className="md:hidden" />
            </div>
            {infoColumns?.length ? (
              <div className="grid grid-cols-1 gap-x-gap-lg gap-y-gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:w-[841px]">
                {infoColumns.map((column) => (
                  <InfoColumn key={column._key} column={column} />
                ))}
              </div>
            ) : null}
          </div>

          {/* Band 2 and 3: navigation, then the legal row. */}
          <div className="flex flex-col gap-20 md:gap-gap-lg">
            <FooterMenu menu={footerMenu} />

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <p className="font-secondary text-body-base leading-[1.6] opacity-75 md:text-body-small md:opacity-100">
                Copyright © {new Date().getFullYear()} {organizationName}
              </p>
              <div className="flex flex-col gap-5 md:gap-gap-md sm:flex-row sm:items-end">
                <FooterInlineMenu menu={legalMenu} />
                <SocialLinks links={socialLinks} className="hidden md:flex" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
