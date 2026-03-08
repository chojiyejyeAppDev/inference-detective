'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

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
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 border border-exam-red/30 bg-exam-highlight p-8">
          <div className="w-10 h-10 rounded-full border-2 border-exam-ink flex items-center justify-center">
            <AlertTriangle size={18} className="text-exam-red" />
          </div>
          <div className="text-center">
            <p className="text-exam-ink font-semibold text-sm">페이지 로딩 중 오류가 발생했어요</p>
            <p className="text-stone-500 text-xs mt-1">
              {this.state.error?.message ?? '알 수 없는 오류'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1 px-4 py-2 border border-exam-rule text-exam-ink text-xs font-medium hover:bg-bg-base transition-colors"
          >
            <RefreshCw size={12} />
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
