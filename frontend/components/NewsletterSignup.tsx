import {ArrowForwardIcon} from '@/components/icons'
import FormView from '@/components/ui/form/FormView'
import {allFields} from '@/sanity/lib/forms'
import type {FormContent} from '@/sanity/lib/types'

/**
 * Newsletter signup. When the footer references a published form with at least one field, it is
 * that form, rendered inline through the shared form pipeline (validation, honeypot, Turnstile,
 * stored as a `formSubmission`). Otherwise - no reference, an unpublished form, an empty one - it
 * falls back to the disabled presentational form, so the footer never throws or shows a form that
 * silently does nothing. The email-provider sync is deferred; see DECISIONS.md.
 */

export default function NewsletterSignup({
  heading,
  form,
}: {
  heading: string
  form?: FormContent | null
}) {
  if (form?._id && allFields(form).length > 0) {
    return (
      <div className="flex w-full max-w-[346px] flex-col gap-gap-md">
        <p className="font-primary text-headline-base leading-[1.3] text-balance">{heading}</p>
        <FormView form={form} variant="inline" />
      </div>
    )
  }
  return <DisabledSignup heading={heading} />
}

function DisabledSignup({heading}: {heading: string}) {
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
