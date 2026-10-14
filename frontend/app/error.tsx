'use client'

import ServerError from '@/components/ServerError'

/**
 * Catches a route that throws while the root layout is still healthy, so the header and footer
 * stay in place around it. A failure in the layout itself is global-error.tsx.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & {digest?: string}
  unstable_retry: () => void
}) {
  return <ServerError error={error} retry={unstable_retry} />
}
