type IconButtonProps = {
  children: React.ReactNode
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  className?: string
}

const VARIANT_CLASSES = {
  primary: 'icon-button-primary',
  secondary: 'icon-button-secondary',
  ghost: 'icon-button-ghost',
} as const

export default function IconButton({
  children,
  label,
  variant = 'primary',
  disabled = false,
  type = 'button',
  onClick,
  className,
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`icon-button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
