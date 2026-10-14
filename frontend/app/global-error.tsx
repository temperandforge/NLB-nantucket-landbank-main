'use client'

import '../css/globals.css'

import {DM_Mono, DM_Sans, EB_Garamond} from 'next/font/google'

import ServerError from '@/components/ServerError'

/**
 * The last resort: the root layout threw, so there is no header, footer, Sanity data or site
 * fonts. It replaces the layout, so it brings its own <html>, stylesheet and fonts, and nothing in
 * it may fetch content. Same screen as error.tsx, minus the site chrome.
 */
const ebGaramond = EB_Garamond({variable: '--font-eb-garamond', subsets: ['latin'], display: 'swap'})
const dmSans = DM_Sans({variable: '--font-dm-sans', subsets: ['latin'], display: 'swap'})
const dmMono = DM_Mono({variable: '--font-dm-mono', weight: ['400'], subsets: ['latin'], display: 'swap'})

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & {digest?: string}
  unstable_retry: () => void
}) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="flex min-h-screen flex-col justify-center">
        <title>Something went wrong</title>
        <ServerError error={error} retry={unstable_retry} />
      </body>
    </html>
  )
}
