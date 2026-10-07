type ButtonProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  leftIcon?: boolean
  rightIcon?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  className?: string
}

// Full class names as literals, so Tailwind's scanner sees them.
const VARIANT_CLASSES = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
} as const

function Asterisk() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" aria-hidden="true">
      <path
        d="M12 6V18M17.196 9L6.804 15M6.804 9L17.196 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Button({
  children,
  variant = 'primary',
  leftIcon = true,
  rightIcon = true,
  disabled = false,
  type = 'button',
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {leftIcon && <Asterisk />}
      <span>{children}</span>
      {rightIcon && <Asterisk />}
    </button>
  )
}
