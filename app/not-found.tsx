import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {/* Problem number circle with ? */}
        <div className="w-16 h-16 border-2 border-exam-ink rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-black text-exam-red">?</span>
        </div>
        <h1 className="font-exam-serif text-lg font-bold text-exam-ink mb-2">
          이 페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-stone-500 mb-8">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </p>
        <Link
          href="/levels"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
