import {DownloadIcon} from '@/components/icons'
import {type RecordItem, recordLabel} from '@/sanity/lib/archiveFilter'

/**
 * One record: its name, and a download link spanning the row (Figma: record links). The tray icon
 * is faint at rest and dark on hover, when the row indents 12px and takes the darker surface under
 * the same 70% light overlay as the form hover (--ui-hover-lighter), as in Figma.
 */
export default function RecordRow({record}: {record: RecordItem}) {
  if (!record.fileUrl) return null
  return (
    <li className="border-t border-border-light">
      <a
        href={record.fileUrl}
        download
        className="group flex [--record-hover:color-mix(in_srgb,var(--color-background)_70%,var(--color-surface-dark))] items-center justify-between gap-6 bg-background py-6 font-mono text-body-base leading-[1.6] text-on-background no-underline transition-[padding,background-color] hover:bg-(--record-hover) hover:px-3 focus-visible:bg-(--record-hover) focus-visible:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500"
      >
        <span>{recordLabel(record)}</span>
        <DownloadIcon className="size-6 shrink-0 text-border-light group-hover:text-on-background group-focus-visible:text-on-background" />
      </a>
    </li>
  )
}
