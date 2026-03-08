'use client'

import * as Sentry from '@sentry/nextjs'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

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
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {/* Problem number circle */}
        <div className="w-16 h-16 border-2 border-exam-ink rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-xl font-black text-exam-red">!</span>
        </div>
        <h2 className="font-exam-serif text-lg font-bold text-exam-ink mb-2">
          잠깐, 문제가 생겼어요
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          걱정 마세요 — 진행 상황은 저장되어 있어요.
        </p>

        <div className="flex gap-3 justify-center">
          <Button variant="primary" size="md" onClick={reset} className="px-5">
            다시 시도
          </Button>
          <Link
            href="/levels"
            className="px-5 py-2.5 border border-exam-rule text-exam-ink text-sm font-medium hover:bg-bg-base transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {/* Technical details — collapsible */}
        {error.message && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-500 transition-colors text-center">
              기술적 세부 사항
            </summary>
            <p className="mt-2 text-xs text-stone-400 bg-stone-100 dark:bg-stone-800/50 rounded p-3 break-all">
              {error.message}
              {error.digest && (
                <span className="block mt-1 text-stone-300">ID: {error.digest}</span>
              )}
            </p>
          </details>
        )}

        {/* Subtle report link */}
        <button
          onClick={handleReport}
          disabled={reported}
          className="mt-4 text-xs text-stone-400 hover:text-exam-ink transition-colors disabled:text-stone-300"
        >
          {reported ? '신고 완료 — 감사합니다!' : '문제 신고'}
        </button>
      </div>
    </div>
  )
}
