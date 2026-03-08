'use client'

import * as Sentry from '@sentry/nextjs'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [reported, setReported] = useState(false)

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  function handleReport() {
    Sentry.captureMessage('User-reported app error', {
      level: 'warning',
      extra: { errorMessage: error.message, digest: error.digest },
    })
    setReported(true)
  }

  return (
    <div className="min-h-screen bg-bg-game flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-white mb-2">문제가 발생했어요</h2>
        <p className="text-sm text-slate-400 mb-6">
          예상치 못한 오류가 발생했어요. 다시 시도해주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            홈으로
          </Link>
        </div>
        <button
          onClick={handleReport}
          disabled={reported}
          className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors disabled:text-slate-600"
        >
          {reported ? '신고 완료 — 감사합니다!' : '이 오류 신고하기'}
        </button>
      </div>
    </div>
  )
}
