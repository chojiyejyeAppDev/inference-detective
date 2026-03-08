'use client'

import * as Sentry from '@sentry/nextjs'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function GameError({
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
    Sentry.captureMessage('User-reported game error', {
      level: 'warning',
      extra: { errorMessage: error.message, digest: error.digest },
    })
    setReported(true)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {/* Problem number circle */}
        <div className="w-16 h-16 border-2 border-exam-ink rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-xl font-black text-exam-red">!</span>
        </div>
        <h2 className="font-exam-serif text-lg font-bold text-exam-ink mb-2">게임 중 오류가 발생했어요</h2>
        <p className="text-sm text-stone-500 mb-6">
          일시적인 문제일 수 있어요. 다시 시도하거나 레벨 선택으로 돌아가주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/levels"
            className="px-5 py-2.5 border border-exam-rule text-exam-ink text-sm font-medium hover:bg-bg-base transition-colors"
          >
            레벨 선택
          </Link>
        </div>
        <button
          onClick={handleReport}
          disabled={reported}
          className="mt-4 text-xs text-stone-400 hover:text-exam-ink transition-colors disabled:text-stone-300"
        >
          {reported ? '신고 완료 — 감사합니다!' : '이 오류 신고하기'}
        </button>
      </div>
    </div>
  )
}
