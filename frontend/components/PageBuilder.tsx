import {draftMode} from 'next/headers'

import DraftPageBuilderLoader from '@/components/DraftPageBuilderLoader'
import {RenderEmptyState, RenderSections} from '@/components/PageSections'
import {GetPageQueryResult} from '@/sanity.types'

/**
 * Renders the blocks from a page's `pageBuilder` field.
 *
 * A server component: visitors get plain server-rendered blocks and none of the editing library.
 * Only Draft Mode (Studio Presentation) renders the optimistic client version, whose chunk is
 * therefore never downloaded by anyone else. Don't import `next-sanity/hooks` here.
 */
export default async function PageBuilder({page}: {page: GetPageQueryResult}) {
  const {isEnabled} = await draftMode()
  if (isEnabled) return <DraftPageBuilderLoader page={page} />

  const sections = page?.pageBuilder
  return sections && sections.length > 0 ? (
    <RenderSections pageBuilderSections={sections} page={page} />
  ) : (
    <RenderEmptyState page={page} />
  )
}
