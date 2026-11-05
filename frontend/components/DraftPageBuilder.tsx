'use client'

import {SanityDocument} from 'next-sanity'
import {useOptimistic} from 'next-sanity/hooks'

import {RenderEmptyState, RenderSections} from '@/components/PageSections'
import {GetPageQueryResult} from '@/sanity.types'
import {PageBuilderSection} from '@/sanity/lib/types'

type PageData = {
  _id: string
  _type: string
  pageBuilder?: PageBuilderSection[]
}

/**
 * The page builder as Studio Presentation sees it: sections update optimistically as an editor
 * types. Rendered only in Draft Mode. `useOptimistic` pulls in the whole visual-editing library
 * (about 180 KB compressed), so a visitor's page must never import it: see PageBuilder.
 */
export default function DraftPageBuilder({page}: {page: GetPageQueryResult}) {
  const pageBuilderSections = useOptimistic<
    PageBuilderSection[] | undefined,
    SanityDocument<PageData>
  >(page?.pageBuilder || [], (currentSections, action) => {
    // The action contains updated document data from Sanity
    // when someone makes an edit in the Studio

    // If the edit was to a different document, ignore it
    if (action.id !== page?._id) {
      return currentSections
    }

    // If there are sections in the updated document, use them
    if (action.document.pageBuilder) {
      // Reconcile References. https://www.sanity.io/docs/enabling-drag-and-drop#ffe728eea8c1
      return action.document.pageBuilder.map(
        (section) => currentSections?.find((s) => s._key === section?._key) || section,
      )
    }

    // Otherwise keep the current sections
    return currentSections
  })

  return pageBuilderSections && pageBuilderSections.length > 0 ? (
    <RenderSections pageBuilderSections={pageBuilderSections} page={page} />
  ) : (
    <RenderEmptyState page={page} />
  )
}
