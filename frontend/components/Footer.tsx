import FooterMenu, {FooterInlineMenu} from '@/components/FooterMenu'
import NewsletterSignup from '@/components/NewsletterSignup'
import SocialLinks from '@/components/SocialLinks'
import AnchorLink from '@/components/ui/AnchorLink'
import {sanityFetch} from '@/sanity/lib/live'
import {footerQuery} from '@/sanity/lib/queries'
import type {FooterInfoColumnData} from '@/sanity/lib/types'

/**
 * Site footer.
 *
 * Owns only layout - the four bands and the decorative wave. What a menu item, an info line
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
    <div className="flex flex-col gap-5">
      <h2 className={LABEL_CLASS}>{column.heading}</h2>
      <ul className="flex flex-col gap-2 font-secondary text-body-base leading-[1.6] opacity-75">
        {column.lines.map((line) => (
          <li key={line._key}>
            {/* href is optional per line, so an email or phone number can be actionable
                while an address line stays plain text. */}
            {line.href ? (
              <AnchorLink
                href={line.href}
                className="transition-opacity hover:opacity-75 focus-visible:opacity-75"
              >
                {line.text}
              </AnchorLink>
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
        Decorative wave. Two pieces of artwork, as in Figma: the desktop one is a 4758x760 box centred
        on the footer, with the artwork bleeding past its top and left edges (inset -7.29% / -1.1%),
        which is why the SVG itself is 4810x815. The mobile one is its own, taller artwork (4592x1526,
        the viewBox starts at -2108,-17 so the whole drawing is in view): it hangs from 17px above the
        footer's top edge and runs to about 1,500px down, behind the stacked contact and menu columns.
        Both are clipped by the footer's overflow-hidden.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 hidden h-[760px] w-[4758px] -translate-x-1/2 select-none md:block"
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-17px] left-[calc(50%+0.5px)] h-[1526px] w-[4592px] -translate-x-1/2 select-none md:hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed-size SVG. */}
        <img src="/images/footer-wave-mobile.svg" alt="" className="block size-full max-w-none" />
      </div>

      <div className="relative tf-px pt-10 pb-12 md:py-global-margin">
        {/* Four bands stacked with 80px between them: newsletter and social, contact info,
            navigation, then the legal row. */}
        <div className="flex flex-col gap-20 tf-max-w">
          {/* One set of social links: under the signup form on mobile, top-right from md. */}
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {newsletterHeading ? (
              <NewsletterSignup heading={newsletterHeading} form={newsletterForm} />
            ) : null}
            <SocialLinks links={socialLinks} />
          </div>

          {/* Same five-column grid as the menu below, so the columns line up. */}
          {infoColumns?.length ? (
            <div className="grid grid-cols-1 gap-x-gap-lg gap-y-gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {infoColumns.map((column) => (
                <InfoColumn key={column._key} column={column} />
              ))}
            </div>
          ) : null}

          <FooterMenu menu={footerMenu} />

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <p className="font-secondary text-body-base leading-[1.6] opacity-75 text-pretty md:opacity-100">
              Copyright © {new Date().getFullYear()} {organizationName}
            </p>
            <FooterInlineMenu menu={legalMenu} />
          </div>
        </div>
      </div>
    </footer>
  )
}
