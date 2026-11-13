import {DownloadIcon} from '@/components/icons'
import {type RecordItem, recordLabel} from '@/sanity/lib/archiveFilter'

/**
 * One record: its name, and a download link spanning the row (Figma: record links). The tray icon
 * is faint at rest and dark on hover, when the content indents 12px and the row takes the darker
 * surface under the same 70% light overlay as the form hover (--ui-hover-lighter), as in Figma.
 * The row keeps a constant 12px padding (offset by -mx-3) and only its content moves, so the label
 * never re-wraps on hover. SearchResults uses the same treatment.
 */
export default function RecordRow({record}: {record: RecordItem}) {
  if (!record.fileUrl) return null
  return (
    <li className="border-t border-border-light">
      <a
        href={record.fileUrl}
        download
        className="group -mx-3 flex [--record-hover:color-mix(in_srgb,var(--color-background)_70%,var(--color-surface-dark))] items-center justify-between gap-9 bg-background px-3 py-6 font-mono text-body-base leading-[1.6] text-on-background no-underline transition-colors hover:bg-(--record-hover) focus-visible:bg-(--record-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500"
      >
        <span className="transition-transform group-hover:translate-x-3 group-focus-visible:translate-x-3 motion-reduce:transition-none">
          {recordLabel(record)}
        </span>
        <DownloadIcon className="size-6 shrink-0 text-border-light transition-[translate,color] group-hover:-translate-x-3 group-hover:text-on-background group-focus-visible:-translate-x-3 group-focus-visible:text-on-background motion-reduce:transition-none" />
      </a>
    </li>
  )
}
