import {toPlainText} from 'next-sanity'

import JsonLd from '@/components/JsonLd'
import {sanityFetch} from '@/sanity/lib/live'
import {siteStructuredDataQuery} from '@/sanity/lib/queries'
import {getSiteUrl} from '@/sanity/lib/siteUrl'
import {type JsonLdGraph, organizationLd, websiteLd} from '@/sanity/lib/structuredData'

/**
 * The Organization and WebSite graphs, emitted on every page from the root layout. Renders nothing
 * without a site origin or when the fetch fails: it sits on every page, so it must degrade.
 */
export default async function SiteJsonLd() {
  let graphs: (JsonLdGraph | null)[] = []
  try {
    const {data: settings} = await sanityFetch({query: siteStructuredDataQuery, stega: false})
    if (settings) {
      const origin = getSiteUrl(settings)
      graphs = [
        organizationLd(
          {name: settings.title, organization: settings.organization, logoUrl: settings.organization?.logoUrl},
          origin,
        ),
        websiteLd(
          {
            name: settings.title,
            description: settings.description || (settings.siteDescription ? toPlainText(settings.siteDescription) : null),
          },
          origin,
        ),
      ]
    }
  } catch {
    // Structured data is an enhancement; a failed fetch must not take the page down.
  }
  return <JsonLd data={graphs} />
}
