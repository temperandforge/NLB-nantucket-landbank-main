import {ArrowLeftIcon, ArrowRightIcon} from '@/components/icons'
import AnchorLink from '@/components/ui/AnchorLink'

type ButtonLinkProps = {
  label: string
  href: string
  /** An arrow before the label, for a link that goes back. */
  leftIcon?: boolean
  /** An arrow after the label. */
  rightIcon?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  newTab?: boolean
  className?: string
}

// Full class names as literals, so Tailwind's scanner sees them.
const VARIANT_CLASSES = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
} as const

export default function ButtonLink({
  label,
  href,
  variant = 'primary',
  newTab = false,
  leftIcon = false,
  rightIcon = false,
  className,
}: ButtonLinkProps) {
  return (
    <AnchorLink
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {leftIcon && <ArrowLeftIcon className="size-6 shrink-0" />}
      {label}
      {rightIcon && <ArrowRightIcon className="size-6 shrink-0" />}
    </AnchorLink>
  )
}
