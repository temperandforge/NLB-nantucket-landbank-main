'use client'

import {useEffect} from 'react'

import ErrorPage from '@/components/ErrorPage'
import ButtonLink from '@/components/ui/ButtonLink'

/**
 * The "something broke" screen, shared by error.tsx (a route threw, the site chrome is still
 * there) and global-error.tsx (the root layout threw, so there is no chrome). Retry re-renders the
 * failed segment; the home link is a plain anchor, so from global-error it is a full reload, which
 * is what recovers a broken root.
 */
export default function ServerError({
  error,
  retry,
}: {
  error: Error & {digest?: string}
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorPage
      heading="Something went off the trail."
      eyebrow="500"
      body="That one is on us. The page ran into a problem while loading. Try again, and if it keeps happening, come back a little later."
    >
      <div className="flex flex-col items-start gap-4">
        <ButtonLink variant="secondary" label="Back to home" href="/" leftIcon />
        <button
          type="button"
          onClick={retry}
          className="cursor-pointer font-sans text-body-base text-on-background underline decoration-border-alt decoration-2 underline-offset-4 hover:decoration-on-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moody-moor-500"
        >
          Try again
        </button>
      </div>
      {error.digest && (
        <p className="font-mono text-body-small tracking-wide text-on-background-subtle">
          Reference {error.digest}
        </p>
      )}
    </ErrorPage>
  )
}
