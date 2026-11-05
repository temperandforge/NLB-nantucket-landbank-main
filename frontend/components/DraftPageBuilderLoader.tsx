'use client'

import dynamic from 'next/dynamic'

import {GetPageQueryResult} from '@/sanity.types'

/**
 * The optimistic page builder, loaded as its own chunk. A client component with `next/dynamic` is
 * what keeps `next-sanity/hooks` (the whole visual-editing library) out of a visitor's first load:
 * see PageBuilder. It still renders on the server, so Draft Mode pages arrive with content.
 */
const DraftPageBuilder = dynamic(() => import('@/components/DraftPageBuilder'))

export default function DraftPageBuilderLoader({page}: {page: GetPageQueryResult}) {
  return <DraftPageBuilder page={page} />
}
