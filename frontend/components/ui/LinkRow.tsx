import {ArrowRightIcon, DownloadIcon} from '@/components/icons'

type LinkRowProps = {
  label: string
  href: string
  /** Link shows an arrow; download shows the download tray and marks the link as a download. */
  icon: 'link' | 'download'
  newTab?: boolean
  className?: string
}

export default function LinkRow({label, href, icon, newTab = false, className}: LinkRowProps) {
  return (
    <a
      href={href}
      download={icon === 'download' ? '' : undefined}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`link-item--inactive hover:link-item--hover transition-colors ${className ?? ''}`}
    >
      <span>{label}</span>
      {icon === 'download' ? <DownloadIcon /> : <ArrowRightIcon />}
    </a>
  )
}
