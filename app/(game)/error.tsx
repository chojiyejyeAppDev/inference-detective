'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg-game flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-white mb-2">게임 중 오류가 발생했어요</h2>
        <p className="text-sm text-slate-400 mb-6">
          일시적인 문제일 수 있어요. 다시 시도하거나 레벨 선택으로 돌아가주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/levels"
            className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            레벨 선택
          </Link>
        </div>
      </div>
    </div>
  )
}
