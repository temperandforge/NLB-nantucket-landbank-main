import {LIGHT_BROWN_LINES_DESKTOP, LIGHT_BROWN_LINES_MOBILE} from './heroSecondaryLightBrownSvg'
import {HERO_SECONDARY_LINES} from './heroSecondaryLinesSvg'

const OPACITY = {lowlands: 0.6, 'moody-moor': 0.4, 'light-brown': 1} as const

// The decorative lines are inlined instead of drawn as a CSS background. A background image is
// found late (after the stylesheet) and Lighthouse picked it as the page's Largest Contentful
// Paint, delaying LCP by about 2.4 s for a 1.4 KB ornament. Inline SVG is not an LCP candidate, so
// the real hero photo is. `slice` reproduces the old `background-size: cover`.
export default function HeroSecondaryLines({variant}: {variant: keyof typeof OPACITY}) {
  if (variant === 'light-brown') {
    // Two drawings, one per breakpoint, each at its natural size (see heroSecondaryLightBrownSvg).
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="md:hidden" dangerouslySetInnerHTML={{__html: LIGHT_BROWN_LINES_MOBILE}} />
        <div className="hidden md:block" dangerouslySetInnerHTML={{__html: LIGHT_BROWN_LINES_DESKTOP}} />
      </div>
    )
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{opacity: OPACITY[variant]}}
      aria-hidden="true"
      dangerouslySetInnerHTML={{__html: HERO_SECONDARY_LINES[variant]}}
    />
  )
}
