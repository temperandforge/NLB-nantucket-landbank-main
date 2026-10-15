import {ArrowForwardIcon} from '@/components/icons'

/**
 * Newsletter signup - PRESENTATIONAL ONLY.
 *
 * Deliberately has no submit handler, no action, and no client-side state: the email provider
 * has not been chosen yet, so there is nothing to submit to. Wiring this up (provider, server
 * action, validation, success/error states) is tracked as deferred work in
 * docs/superpowers/specs/2026-07-29-footer-globals-design.md.
 *
 * The input is disabled so the form cannot be filled in and silently do nothing, which would
 * read as a bug to a visitor.
 */

export default function NewsletterSignup({heading}: {heading: string}) {
  return (
    <div className="flex w-full max-w-[346px] flex-col gap-8 md:gap-gap-md">
      <p className="font-primary text-headline-lg leading-[1.1] text-balance md:text-headline-base md:leading-[1.3]">
        {heading}
      </p>
      {/* No action and no onSubmit: both controls are disabled, so the form cannot be
          submitted at all until a provider is wired up. */}
      <form className="flex items-center gap-gap-mini" aria-describedby="newsletter-status">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          disabled
          placeholder="Email"
          className="h-12 min-w-0 flex-1 rounded-[4px] bg-input px-gap-sm font-secondary text-body-base text-lowlands-500 placeholder:text-on-input-placeholder md:h-[42px] md:py-[10px] md:text-body-small disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled
          className="flex size-12 shrink-0 md:size-[42px] items-center justify-center rounded-[4px] bg-goldenrod-500 text-lowlands-500 disabled:cursor-not-allowed"
        >
          <span className="sr-only">Subscribe</span>
          <ArrowForwardIcon className="size-[24px]" />
        </button>
      </form>
      <p id="newsletter-status" className="sr-only">
        Newsletter signup is not yet available.
      </p>
    </div>
  )
}
