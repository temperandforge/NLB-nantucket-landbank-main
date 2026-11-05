import {HERO_SECONDARY_LINES} from './heroSecondaryLinesSvg'

const OPACITY = {lowlands: 0.6, 'moody-moor': 0.4, 'light-brown': 0.6} as const

// The decorative lines are inlined instead of drawn as a CSS background. A background image is
// found late (after the stylesheet) and Lighthouse picked it as the page's Largest Contentful
// Paint, delaying LCP by about 2.4 s for a 1.4 KB ornament. Inline SVG is not an LCP candidate, so
// the real hero photo is. `slice` reproduces the old `background-size: cover`.
export default function HeroSecondaryLines({variant}: {variant: keyof typeof OPACITY}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{opacity: OPACITY[variant]}}
      aria-hidden="true"
      dangerouslySetInnerHTML={{__html: HERO_SECONDARY_LINES[variant]}}
    />
  )
}
