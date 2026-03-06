'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg-game flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-white mb-2">문제가 발생했어요</h2>
        <p className="text-sm text-slate-400 mb-6">
          예상치 못한 오류가 발생했어요. 다시 시도해주세요.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
