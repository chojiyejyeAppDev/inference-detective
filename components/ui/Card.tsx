import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'

type CardVariant = 'default' | 'highlight' | 'success' | 'bordered'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children: ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-exam-rule bg-white',
  highlight: 'border border-exam-red/30 bg-exam-highlight',
  success: 'border border-green-200 bg-green-50',
  bordered: 'border-2 border-exam-ink bg-white',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[variantStyles[variant], 'p-5', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

export default Card
