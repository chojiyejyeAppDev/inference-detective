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
    // 프로덕션에서 Sentry 등으로 에러 리포팅 가능
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
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-8">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-semibold text-sm">페이지 로딩 중 오류가 발생했어요</p>
            <p className="text-slate-500 text-xs mt-1">
              {this.state.error?.message ?? '알 수 없는 오류'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs font-medium hover:bg-slate-800 transition-colors"
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
