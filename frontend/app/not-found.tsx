import type {Metadata} from 'next'

import ErrorPage from '@/components/ErrorPage'
import SearchField from '@/components/search/SearchField'
import ButtonLink from '@/components/ui/ButtonLink'

/**
 * Every 404: a path no route matches, and anything that calls notFound() (an unknown page, news
 * article, project or event slug). It renders inside the root layout, so the header and footer
 * stay. No links beyond the home page and search: a CMS page's URL can't be known from here, and
 * a guessed one would 404 too.
 */
export const metadata: Metadata = {title: 'Page not found'}

export default function NotFound() {
  return (
    <ErrorPage
      heading="This page is off the map."
      eyebrow="404"
      body="The address may have changed, or it may never have existed. Search for what you were after, or start again from the front page."
    >
      <SearchField className="w-full max-w-xl" />
      <ButtonLink variant="secondary" label="Back to home" href="/" leftIcon className="mt-4" />
    </ErrorPage>
  )
}
