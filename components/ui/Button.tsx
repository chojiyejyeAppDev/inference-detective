import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-exam-ink text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'border border-exam-rule text-exam-ink hover:bg-bg-base disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-stone-500 hover:text-exam-ink disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'border border-exam-red text-exam-red hover:bg-exam-highlight disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
