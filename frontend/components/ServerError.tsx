'use client'

import {useEffect} from 'react'

import ErrorPage from '@/components/ErrorPage'
import Button from '@/components/ui/Button'

/**
 * The "something broke" screen, shared by error.tsx (a route threw, the site chrome is still
 * there) and global-error.tsx (the root layout threw, so there is no chrome). Retry re-renders the
 * failed segment, and for a broken root layout it is what recovers the page.
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
      <Button variant="secondary" leftIcon={false} rightIcon={false} onClick={retry}>
        Try again
      </Button>
      {error.digest && (
        <p className="font-mono text-body-small tracking-wide text-on-background-subtle">
          Reference {error.digest}
        </p>
      )}
    </ErrorPage>
  )
}
