'use client'

import {VisualEditing} from 'next-sanity/visual-editing'

import DraftModeToast from '@/components/DraftModeToast'

/** The code behind DraftTools. Only DraftTools imports this, and only dynamically. */
export default function DraftToolsImpl() {
  return (
    <>
      <DraftModeToast />
      <VisualEditing />
    </>
  )
}
