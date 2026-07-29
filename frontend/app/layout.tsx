import '../css/globals.css'

import {SpeedInsights} from '@vercel/speed-insights/next'
import type {Metadata} from 'next'
import {Inter, IBM_Plex_Mono, EB_Garamond, DM_Sans, DM_Mono} from 'next/font/google'
import {draftMode} from 'next/headers'
import {toPlainText} from 'next-sanity'
import {VisualEditing} from 'next-sanity/visual-editing'
import {Toaster} from 'sonner'

import DraftModeToast from '@/components/DraftModeToast'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import * as demo from '@/sanity/lib/demo'
import {sanityFetch, SanityLive} from '@/sanity/lib/live'
import {settingsQuery} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'
import {handleError} from '@/app/client-utils'

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    // Metadata should never contain stega
    stega: false,
  })
  const title = settings?.title || demo.title
  const description = settings?.description || demo.description

  const ogImage = resolveOpenGraphImage(settings?.ogImage)
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = settings?.ogImage?.metadataBase
      ? new URL(settings.ogImage.metadataBase)
      : undefined
  } catch {
    // ignore
  }
  return {
    metadataBase,
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description: toPlainText(description),
    openGraph: {
      images: ogImage ? [ogImage] : [],
    },
  }
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
})

/**
 * Nantucket brand fonts, mapped to the Figma type tokens:
 *  - EB Garamond  = font/family-primary   (headlines)
 *  - DM Sans      = font/family-secondary (body)
 *  - DM Mono      = the tracked uppercase labels
 * Wired into Tailwind as font-primary / font-secondary / font-mono-tracked in globals.css.
 * Inter and IBM Plex Mono above are kept because other pages still reference them.
 */
const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond',
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
})

export default async function RootLayout({children}: LayoutProps<'/'>) {
  const {isEnabled: isDraftMode} = await draftMode()

  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${ebGaramond.variable} ${dmSans.variable} ${dmMono.variable} bg-white text-black`}
    >
      {/* Vertical padding lives on <main>, not <body>: the footer is full-bleed and body
          padding would inset it from the viewport edges. */}
      <body className="flex flex-col min-h-screen">
        <a href="#pageMain" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-brand focus:text-white focus:px-4 focus:py-2">
          Skip to main content
        </a>
        {/* The <Toaster> component is responsible for rendering toast notifications used in /app/client-utils.ts and /app/components/DraftModeToast.tsx */}
        <Toaster />
        {isDraftMode && (
          <>
            <DraftModeToast />
            {/*  Enable Visual Editing, only to be rendered when Draft Mode is enabled */}
            <VisualEditing />
          </>
        )}
        {/* The <SanityLive> component is responsible for making all sanityFetch calls in your application live, so should always be rendered. */}
        <SanityLive onError={handleError} />
        <Header />
        <main className="pageMain grow py-24" id="pageMain">
          {children}
        </main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  )
}
