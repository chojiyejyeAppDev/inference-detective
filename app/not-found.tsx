import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0C1628] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-black text-amber-400">?</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">페이지를 찾을 수 없어요</h1>
        <p className="text-slate-400 text-sm mb-8">요청하신 페이지가 존재하지 않거나 이동되었어요.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
