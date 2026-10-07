import {ArrowLeftIcon, ArrowRightIcon} from '@/components/icons'

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
    <a href={href} className={`link-button ${className ?? ''}`}>
      {iconLeft && <ArrowLeftIcon className="link-button-icon" />}
      <span>{label}</span>
      {iconRight && <ArrowRightIcon className="link-button-icon" />}
    </a>
  )
}
