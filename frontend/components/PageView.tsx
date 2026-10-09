import PageBuilderPage from '@/components/PageBuilder'
import {GetPageQueryResult} from '@/sanity.types'

/**
 * A page's page builder. Shared by the catch-all route and the landing page at `/`, so both
 * render a page identically. The page's own content, including any heading, comes from its
 * sections - the document has no heading field. No wrapper margin: a hero video sits flush
 * under the header, and other blocks set their own vertical spacing.
 */
export default function PageView({page}: {page: NonNullable<GetPageQueryResult>}) {
  return (
    <PageBuilderPage page={page} />
  )
}
