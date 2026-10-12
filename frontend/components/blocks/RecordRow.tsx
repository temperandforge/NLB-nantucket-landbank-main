import {DownloadIcon} from '@/components/icons'
import {type RecordItem, recordLabel} from '@/sanity/lib/archiveFilter'

/**
 * One record: its name, and a download link spanning the row (Figma: record links). The tray icon
 * is faint at rest and dark on hover, when the row takes the darker surface and indents.
 */
export default function RecordRow({record}: {record: RecordItem}) {
  if (!record.fileUrl) return null
  return (
    <li className="border-t border-border-light">
      <a
        href={record.fileUrl}
        download
        className="group flex items-center justify-between gap-6 bg-background py-6 font-mono text-body-base leading-[1.6] text-on-background no-underline transition-[padding,background-color] hover:bg-surface-dark hover:px-3 hover:text-on-surface-dark focus-visible:bg-surface-dark focus-visible:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500"
      >
        <span>{recordLabel(record)}</span>
        <DownloadIcon className="size-6 shrink-0 text-border-light group-hover:text-on-surface-dark group-focus-visible:text-on-surface-dark" />
      </a>
    </li>
  )
}
