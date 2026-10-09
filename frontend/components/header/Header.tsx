import Image from 'next/image'
import Link from 'next/link'

import {sanityFetch} from '@/sanity/lib/live'
import {headerQuery, siteBannerQuery} from '@/sanity/lib/queries'

import DesktopNav from './DesktopNav'
import HeaderShell from './HeaderShell'
import MobileMenu from './MobileMenu'
import SiteBanner from './SiteBanner'

const LOGO_WIDTH = 184 // natural width of public/images/nlb-logo.svg
const LOGO_HEIGHT = 50 // natural height

/**
 * Site header: the banner, then the sticky nav bar.
 *
 * Owns only composition. Every region is guarded independently - the header is on every page,
 * so a missing banner, a missing header document or an unpublished menu reference degrades to
 * rendering less (down to the logo alone), never to a thrown render. The banner scrolls away
 * with the page; only the bar is sticky.
 */
export default async function Header() {
  const [{data: header}, {data: banner}] = await Promise.all([
    sanityFetch({query: headerQuery}),
    sanityFetch({query: siteBannerQuery}),
  ])
  const menu = header?.mainMenu

  return (
    <>
      {banner?.message && <SiteBanner banner={banner} />}
      <HeaderShell>
        <div className="relative mx-auto flex h-(--header-height) max-w-site items-center justify-between px-gap-md">
          <Link href="/" aria-label="Nantucket Land Bank - home">
            <Image src="/images/nlb-logo.svg" alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority />
          </Link>
          {menu?.items?.length ? (
            <>
              <DesktopNav menu={menu} />
              <MobileMenu menu={menu} />
            </>
          ) : null}
        </div>
      </HeaderShell>
    </>
  )
}
