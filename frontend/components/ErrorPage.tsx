import Eyebrow from '@/components/blocks/Eyebrow'

/**
 * The shared template for every error state: not found, a route that threw, and the root layout
 * itself failing. The design has no error screen, so this one is synthesised from the pages that
 * do exist: the Hero Tertiary layout (headline left, supporting copy right, topographic line art
 * behind) on the cream background, with the contour lines the site already uses as its motif.
 *
 * The idea is the property map's own: a visitor has walked off the edge of it. A footpath winds
 * across the contours and ends at a survey pin. The path draws in once,
 * then the pin drops; nothing loops. The art is decorative and hidden from assistive tech, so the
 * heading and body carry the whole message.
 *
 * Server-safe and hook-free, so a Client Component (error.tsx, global-error.tsx) can render it.
 * Callers pass the actions as children; this owns layout only.
 */

type ErrorPageProps = {
  heading: string
  /** The status, as the small label above the heading ("404", "500"). */
  eyebrow: string
  /** The paragraph under the heading. */
  body: string
  /** The actions: a search field, buttons, a reference code. */
  children?: React.ReactNode
}

export default function ErrorPage({heading, eyebrow, body, children}: ErrorPageProps) {
  return (
    <section className="relative flex w-full items-center overflow-clip bg-background tf-px pt-s6 pb-60 md:min-h-[34rem] md:py-s6">
      {/*
        The art is the section's background, with a fade from the background colour over it so the
        copy always sits on a plain ground. On desktop its box starts a third of the way in and
        bleeds off the right edge, so the summit sits at about three quarters of the width, and the
        fade runs left to right. On mobile the box is the lower part of the section and the fade runs
        top to bottom: opaque behind the copy, clearing to the art under the button. There the
        trail and pin sit above the fade so the summit stays crisp.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute isolate inset-x-0 bottom-0 h-[26rem] select-none md:inset-y-0 md:right-[-25%] md:left-[40%] lg:right-[-15%] lg:left-[35%] md:h-auto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed artwork. */}
        <img
          src="/images/blocks/error-contours.svg"
          alt=""
          className="absolute inset-0 size-full max-w-none"
        />
        <div className="absolute inset-0 z-10 bg-linear-to-b from-background from-35% to-transparent to-80% md:right-auto md:w-1/2 lg:w-[60%] md:bg-linear-to-r md:from-0% md:via-background/85 md:to-100%" />
        {/* Same 720x460 viewBox and slice rule as the contours, so the trail's end lands on the
            summit (360, 230) at any box shape, and the box centre is the summit. */}
        <svg
          viewBox="0 0 720 460"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          className="absolute inset-0 z-20 size-full md:z-0"
        >
          <defs>
            <mask id="error-trail-reveal" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1520" height="1260">
              <path
                className="error-trail-reveal"
                pathLength="1"
                d={TRAIL}
                stroke="#fff"
                strokeWidth="14"
                strokeLinecap="round"
              />
            </mask>
          </defs>
          <path
            d={TRAIL}
            mask="url(#error-trail-reveal)"
            stroke="var(--color-moody-moor-500)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="1 9"
          />
        </svg>
        <div className="error-pin absolute top-1/2 left-1/2 z-20 md:z-0">
          {/* The pin's tip is at x = 16.8 of its 40px width, not the centre: offset to put the
              tip exactly on the summit. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed artwork. */}
          <img
            src="/images/blocks/map-pin.svg"
            alt=""
            className="absolute bottom-0 left-[-16.8px] h-[46px] w-[40px] max-w-none"
          />
        </div>
      </div>

      <div className="tf-max-w relative">
        <div className="flex max-w-[34.5rem] flex-col md:max-w-[58%] lg:max-w-[34.5rem] items-start gap-8">
          <Eyebrow className="text-on-background-subtle">{eyebrow}</Eyebrow>
          <h1 className="-mt-2 text-balance text-headline-2xl leading-[1.05] text-on-background">{heading}</h1>
          <p className="max-w-[34rem] font-sans text-body-large leading-[1.6] text-on-background-subtle">
            {body}
          </p>
          {children}
        </div>
      </div>
    </section>
  )
}

/** Winds in from the lower left edge and ends on the summit at (360, 230). */
const TRAIL =
  'M-10 410C60 430 120 380 168 360C216 340 250 390 296 364C342 338 262 296 304 262C330 241 346 236 360 230'
