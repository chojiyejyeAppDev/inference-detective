import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="text-center">
        {/* Problem number circle with 404 */}
        <div className="w-20 h-20 border-2 border-exam-ink rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-black text-exam-red">404</span>
        </div>
        <h1 className="font-exam-serif text-2xl font-black text-exam-ink mb-2">페이지를 찾을 수 없어요</h1>
        <p className="text-stone-500 text-sm mb-8">요청하신 페이지가 존재하지 않거나 이동되었어요.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
