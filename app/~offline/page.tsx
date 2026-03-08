'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">📡</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">오프라인 상태예요</h1>
        <p className="text-slate-400 text-sm mb-6">
          인터넷 연결을 확인하고 다시 시도해 주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
