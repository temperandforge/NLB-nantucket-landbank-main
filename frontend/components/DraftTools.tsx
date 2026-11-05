'use client'

import dynamic from 'next/dynamic'

/**
 * The editor-only tooling: the Draft Mode toast and Visual Editing overlays. Rendered by the root
 * layout in Draft Mode only.
 *
 * Loaded with `next/dynamic` from a client component on purpose. Any static import, or a dynamic
 * import from a server component, still ships the visual-editing runtime (about 180 KB compressed)
 * to every visitor's first load, rendered or not. Don't import `next-sanity/visual-editing` or
 * `next-sanity/hooks` anywhere a visitor's page can reach.
 */
const Tools = dynamic(() => import('@/components/DraftToolsImpl'), {ssr: false})

export default function DraftTools() {
  return <Tools />
}
