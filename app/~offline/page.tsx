'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {/* Problem number circle */}
        <div className="w-16 h-16 border-2 border-exam-ink rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="font-exam-serif text-lg font-black text-exam-ink">X</span>
        </div>
        <h1 className="font-exam-serif text-xl font-bold text-exam-ink mb-2">오프라인 상태예요</h1>
        <p className="text-stone-500 text-sm mb-6">
          인터넷 연결을 확인하고 다시 시도해 주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
