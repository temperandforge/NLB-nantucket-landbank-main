type ButtonLinkProps = {
  label: string
  href: string
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
  className,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {label}
    </a>
  )
}
