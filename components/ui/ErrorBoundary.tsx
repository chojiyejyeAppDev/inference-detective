'use client'

import { Component, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 border border-exam-rule bg-bg-base p-8">
          <div className="w-10 h-10 rounded-full border-2 border-exam-ink flex items-center justify-center">
            <span className="text-sm font-black text-exam-red">!</span>
          </div>
          <div className="text-center">
            <p className="text-exam-ink font-semibold text-sm">
              일시적인 오류가 발생했어요
            </p>
            <p className="text-stone-500 text-xs mt-1">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={this.handleReset}
            icon={<RefreshCw size={12} />}
          >
            다시 시도
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
