'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="ko">
      <body className="min-h-screen bg-bg-game flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-xl font-bold text-exam-ink mb-2">
            문제가 발생했어요
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
