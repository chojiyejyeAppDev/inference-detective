import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full border bg-white px-3 py-2.5 text-sm text-exam-ink placeholder-stone-500 transition-colors focus:outline-none focus:ring-2 focus:ring-exam-ink/20 focus:ring-offset-1',
          error
            ? 'border-exam-red focus:border-exam-red focus:ring-exam-red/20'
            : 'border-exam-rule focus:border-exam-ink',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

export default Input
