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
  // Each fetch is caught on its own so one failure cannot take down the other region or the layout.
  // (Footer has the same exposure and is intentionally left as is.)
  const [{data: header}, {data: banner}] = await Promise.all([
    sanityFetch({query: headerQuery}).catch(() => ({data: null})),
    sanityFetch({query: siteBannerQuery}).catch(() => ({data: null})),
  ])
  const menu = header?.mainMenu

  return (
    <>
      {banner?.message && <SiteBanner banner={banner} />}
      <HeaderShell>
        <div data-header-bar className="relative mx-auto flex h-(--header-height) max-w-site items-center justify-between tf-max-w">
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
