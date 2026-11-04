import {ArrowLeftIcon, ArrowRightIcon} from '@/components/icons'
import AnchorLink from '@/components/ui/AnchorLink'

type LinkButtonProps = {
  label: string
  href: string
  iconLeft?: boolean
  iconRight?: boolean
  className?: string
}

export default function LinkButton({
  label,
  href,
  iconLeft = false,
  iconRight = true,
  className,
}: LinkButtonProps) {
  return (
    // `data-part`: motion.css only animates headings, text, images and `.button`s as parts of a
    // block's entrance; a link button is none of those, so it must opt in or it never fades in.
    <AnchorLink href={href} className={`link-button ${className ?? ''}`} data-part="">
      {iconLeft && <ArrowLeftIcon className="link-button-icon" />}
      <span>{label}</span>
      {iconRight && <ArrowRightIcon className="link-button-icon" />}
    </AnchorLink>
  )
}
